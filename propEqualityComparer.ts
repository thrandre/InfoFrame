export default class PropEqualityComparer {
        
    private static compare<T>(o1: T, o2: T, selector: (o: T) => any) {
        return selector(o1) === selector(o2);
    }
    
    private static compareBase<T>(o1: T, o2: T, comparer: (o1: T, o2: T) => boolean) {
        var nil = o => o === null || typeof o === "undefined";
        var xor = (x1: boolean, x2: boolean) => x1 ? !x2 : x2;
        
        return xor(nil(o1), nil(o2)) || (!nil(o1) && !nil(o2) && o1 !== o2 && !comparer(o1, o2));
    }
    
    public static objectDidUpdate<T>(o1: T, o2: T, selector: (o: T) => any) {
        return this.compareBase(o1, o2, (o1, o2) => this.compare(o1, o2, selector));
    }
    
    public static arrayDidUpdate<T>(a1: T[], a2: T[], selector: (o: T) => any) {
        return this.compareBase(a1, a2, (a1, a2) => a1.length === a2.length &&
			a1.every(o1 => a2.some(o2 => this.compare(o1, o2, selector))) &&
			a2.every(o1 => a1.some(o2 => this.compare(o1, o2, selector))));
    }
    
}