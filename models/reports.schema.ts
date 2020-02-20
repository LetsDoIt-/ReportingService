"use strict";
import * as mongoose from "mongoose";
const Schema = mongoose.Schema;

const ReportsSchema = new Schema({
    buildingId : String,
    averageAge : Number,
    dateAdded : {type : Date, default: Date.now }
 });

export {
    ReportsSchema
}