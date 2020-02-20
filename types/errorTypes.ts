const ERROR_CONSTANTS = {
    'GENERIC_ERROR' : 'Server encountered an error of unknown type',
    'STORAGE_ERROR' : 'Storage not available try again later.',
    'UTIL_ERROR'    : 'enountered an error please check logs'
}

enum ERROR_CODES {
    INVALID_PARAMETERS = 400,
    NOT_FOUND = 404,
    INTERNAL_SERVER_ERROR = 500,
    STORAGE_ERROR = 501
}

class BaseError extends Error{
    status: number;
    message : string;
    retry?  : boolean;
    constructor({status, message = 'Generic Error', retry} : {status : number, message: string, retry? : boolean}){
        super(message);
        this.status = status;
        this.message = message;
        this.retry = retry;
        Object.setPrototypeOf(this, BaseError.prototype);
    }
}


class StorageError extends BaseError{
    constructor({status, message, retry} : {status : number, message: string, retry? : boolean}){
        super({status,message,retry});
        Object.setPrototypeOf(this, StorageError.prototype);
    }
}

class GenericError extends BaseError{
    constructor({status, message, retry} : {status : number, message: string, retry? : boolean}){
        super({status,message,retry});
        Object.setPrototypeOf(this, GenericError.prototype);
    }
}

class UtilError extends BaseError{
    constructor({status, message, retry} : {status : number, message: string, retry? : boolean}){
        super({status,message,retry});
        Object.setPrototypeOf(this, UtilError.prototype);
    }
}

class InvalidParametersError extends BaseError{
    constructor({status, message, retry} : {status : number, message: string, retry? : boolean}){
        super({status,message,retry});
        Object.setPrototypeOf(this, InvalidParametersError.prototype);
    }
}

export{
    ERROR_CONSTANTS,
    ERROR_CODES,
    StorageError,
    GenericError,
    UtilError,
    InvalidParametersError
}