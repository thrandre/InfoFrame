function isUndefined(obj: any) {
    return !obj;
}

function isEmpty( obj: any[] ) {
    return obj.length === 0;
}

function isUndefinedOrEmpty( obj: any[] ) {
    return isUndefined(obj) || isEmpty(obj);
}