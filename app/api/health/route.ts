export function GET() {
  return Response.json({status:'ok',service:'formfino',fileStorage:false},{headers:{'Cache-Control':'no-store'}});
}
