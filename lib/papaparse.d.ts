declare module 'papaparse' {
 const Papa:{parse<T>(text:string,options?:Record<string,unknown>):{data:T[];errors:{message:string;code:string;type:string;row?:number}[]};unparse(data:unknown,options?:Record<string,unknown>):string};
 export default Papa;
}
