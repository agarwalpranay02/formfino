/** Valid JPEG COM segments. This meets byte minimums without changing pixels. */
export function padJpeg(bytes:Uint8Array,minimum:number):Uint8Array {
  if(bytes[0]!==0xff||bytes[1]!==0xd8)throw new Error('Expected a JPEG image.');
  if(!Number.isSafeInteger(minimum)||minimum<0||minimum>50_000_000)throw new Error('Invalid minimum size.');
  if(bytes.length>=minimum)return bytes;
  let remaining=Math.max(4,minimum-bytes.length);
  const segments:Uint8Array[]=[];
  while(remaining>0){
    let size=Math.min(65537,remaining);
    if(remaining-size>0&&remaining-size<4)size-=4-(remaining-size);
    const segment=new Uint8Array(size);segment.set([0xff,0xfe,(size-2)>>8,(size-2)&255]);
    segments.push(segment);remaining-=size;
  }
  const out=new Uint8Array(bytes.length+segments.reduce((n,s)=>n+s.length,0));
  out.set(bytes.subarray(0,2));let offset=2;
  for(const segment of segments){out.set(segment,offset);offset+=segment.length;}
  out.set(bytes.subarray(2),offset);return out;
}
