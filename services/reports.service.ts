"use strict";
import { Service } from "moleculer";
import * as config from 'config';
import mongoose  from "mongoose";
import {CronJob} from "cron";
import {Errors} from 'moleculer';
import * as util from 'util';
const {MoleculerRetryableError, MoleculerClientError} = Errors;
import DbService  from "moleculer-db";
import MongooseAdapter from "moleculer-db-adapter-mongoose";
import {ReportsSchema} from "../models/reports.schema";


class ReportsService extends Service {
	constructor(broker){
		super(broker);
		this.parseServiceSchema({
            name: "reports",
            metadata: { service: "reports" , collection : "reports"},
            mixins : [DbService],
            adapter: new MongooseAdapter(config.mongodb.connectionUrl),
            model: mongoose.model("Reports",ReportsSchema),
            dependencies : ["buildings"],
            actions: {
                getReport : {
                    cache : false,
                    params : {},
                    handler : this.getReport
                }
            },
            methods: {
                _getCalculatedAvgFromDB : this._getCalculatedAvgFromDB,
                _calculateAverageForABuilding : this._calculateAverageForABuilding,
                _addCalculatedAvgToDB : this._addCalculatedAvgToDB,
                _calculateAvgForAllBuildings : this._calculateAvgForAllBuildings
			},
			events: {},
            created: this._serviceCreated,
            started: this._serviceStarted,
            stopped: this._serviceStopped,
        });
    }
    
    /**
     * Controller function which gathers the proper details
     * This can be extended in the future to have other type of information 
     * e.g. Can accept a parameter reportType and based on the query param we can calculate different things e.g. 
     * averageAge of males, females, number of males, females, pets, minAge, maxAge and so on
     * @param {*} ctx
     * @returns
     * @memberof ReportsService
     */
    async getReport(ctx){
        const method = "getReport";
        try{
            this.logger.info(`Request for method ${method} started`);
            const buildingId = ctx.params.buildingId || "";
            const fromDate = ctx && ctx.params && ctx.params.fromDate || new Date();
            const toDate = ctx && ctx.params && ctx.params.toDate || new Date();
            this.logger.info(`Request for method ${method} parameters ${util.inspect({buildingId,fromDate,toDate})}`);
            const result = await this._getCalculatedAvgFromDB({buildingId,fromDate,toDate});
            this.logger.info(`Results method ${method} ${util.inspect(result)}`);
            return result;
        } catch(err){
            this.logger.error(err);
            // Alert via slack
            throw new MoleculerClientError(`Request failed with err ${util.inspect(err)}`,500)
        }
    }

    // ************************* PRIVATE METHODS **********************************
    /**
     * This private method accepts buildingId, fromDate and toDate as param
     * Does database lookup by buildingId and dateadded 
     * I have commented out the dateAdded logic for simplicity
     * @param {*} {buildingId, fromDate, toDate}
     * @returns
     * @memberof ReportsService
     */
    async _getCalculatedAvgFromDB({buildingId, fromDate, toDate}){
        const method = "_getCalculatedAvgFromDB";
        try{
            this.logger.info(`Request for method ${method} started`);
            const avg = await this.adapter.find({
                query : { 
                    $and : [
                        {buildingId}, 
                        // {dateAdded : { $gte : fromDate, $lte : toDate}}
                    ]
                },
                sort : '-dateAdded',
                fields : ['buildingId','averageAge','dateAdded']
            });
            this.broker.logger.info(`Average from db : ${avg}`);
            return avg && avg[0] ? avg[0] : [];
        } catch(err){
            this.logger.error(err);
            // Alert via slack
            throw new MoleculerRetryableError(`Request failed with err ${util.inspect(err)}`)
        }
    }


    /**
     * This private method takes list of residentIds as input 
     * Pulls residents information from the residents service 
     * and calculates averageAge for each resident
     * This is a good place to also calculate other users information
     * @param {*} {residents}
     * @returns
     * @memberof ReportsService
     */
    async _calculateAverageForABuilding({residents}){
        const method = "_calculateAverageForABuilding";
        try{
            this.logger.info(`Request for method ${method} started`);
            const allResidents = residents.map(async (eachResident) => {
                return await this.broker.call('residents.getResidentData',{residentId : eachResident});
            });
            
            let sum = 0;
    
            await Promise.all(allResidents).then(values => {
                values.forEach((resident:any) => {
                    sum += resident.age;
                })
            });
    
            return sum / residents.length;
        } catch(err){
            this.logger.error(err);
            // Alert via slack
            throw new MoleculerRetryableError(`Request failed with err ${util.inspect(err)}`)
        }
    }

    /**
     * This private method inserts the average age as time series in the database
     * Timeseries helps in having range queries in future e.g. Avg age over 10 years or for plotting graphs and charts
     *
     * @param {*} {buildingId,averageAge}
     * @memberof ReportsService
     */
    async _addCalculatedAvgToDB({buildingId,averageAge}){
        try {
            const report = {
                buildingId,
                averageAge 
            };
            await this.adapter.insert(report);
        } catch(err){
            this.logger.error(err);
            // Alert via slack
            throw new MoleculerRetryableError(`Request failed with err ${util.inspect(err)}`)
        }
    }

    /**
     * This private method loops through each building and for each building calculates the average age for all residents
     *
     * @memberof ReportsService
     */
    async _calculateAvgForAllBuildings(){
        try{
            const allBuildingInfo = await this.broker.call('buildings.getAllBuildingsDetails',{});

            const eachBuildingResults = allBuildingInfo.map(async (each) => {
                const residents = each.residents;
                return {
                    buildingId : each.slug,
                    averageAge : await this._calculateAverageForABuilding({residents})
                }
            })

            await Promise.all(eachBuildingResults).then(async values => {
                values.forEach(async (eachInfo:any) => {
                    await this._addCalculatedAvgToDB({buildingId : eachInfo.buildingId, averageAge : eachInfo.averageAge});
                })
            });
        } catch(err){
            this.logger.error(err);
            // Alert via slack
            throw new MoleculerRetryableError(`Request failed with err ${util.inspect(err)}`)
        }
    }

    async _serviceCreated(){
        this.logger.info('Service created');
    }

    /**
     * Upon service start this cron job runs every 12 hours to get the most upto date data for buildings and residents and store it in mongodb as timeseries information
     * This will enable to make time based queries and help to do queries like 10 year average
     * @memberof ReportsService
     */
    async _serviceStarted(){
        // var job = new CronJob('0 */12 * * *', async () => {
        //     await this._calculateAvgForAllBuildings();
        //   });
        // job.start();
        this.logger.info('Service started');
    }

    async _serviceStopped(){
        this.logger.info('Service stopped');
    }

};

export = ReportsService;
