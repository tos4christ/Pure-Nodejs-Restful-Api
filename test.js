function countOccurrences(object) {
    const proceed = object instanceof Object && Object.keys(object).length > 0 ? object : false;
    if(!proceed) {
        return 'Cannot process this request, Object with data are only valid';
    }
    let counter = {};
    for(key in object) {
        const keyValue = object[key];
        const exists = counter[keyValue] ? true : false;
        if(exists) {
            const length = counter[keyValue];
            counter[keyValue] += 1;
        } else {
            counter[keyValue] = 1;
        }
    }
    return counter;
}

const adj = {
    a: "moron",
    b: "scumbag",
    c: "moron",
    d: "idiot",
    e: "idiot"
};
const result = countOccurrences(adj);
console.log(result);
