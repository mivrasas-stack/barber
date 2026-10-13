// Preflight only: reads .env.production locally; never prints secret values.
const fs=require("node:fs");
const path=require("node:path");
const dotenv=require("dotenv");
const filename=path.resolve(process.argv[2]||".env.production");
const errors=[];
if(!fs.existsSync(filename)){
 console.error("PREFLIGHT_FAIL: No environment file was provided");
 process.exit(1);
}
const env=dotenv.parse(fs.readFileSync(filename));
const get=(name)=>(env[name]||"").trim();
const required=["APP_DOMAIN","AUTH_SECRET","POSTGRES_USER","POSTGRES_PASSWORD",
 "POSTGRES_DB","REDIS_PASSWORD","NEXT_PUBLIC_APP_URL","OUTBOX_PUBLISH_FROM"];
for(const name of required){
 if(!get(name))errors.push(name+" is required");
}
if(get("AUTH_SECRET").length<32)errors.push("AUTH_SECRET must have at least 32 characters");
for(const name of ["POSTGRES_PASSWORD","REDIS_PASSWORD"]){
 if(!/^[A-Za-z0-9_-]{24,}$/.test(get(name))){
  errors.push(name+" must be at least 24 URL-safe random characters (letters/digits/_/-)");
 }
}
const domain=get("APP_DOMAIN");
if(domain.includes("tu-dominio")||domain.includes("example")||domain.startsWith("http")
 ||!/^([a-z0-9-]+\.)+[a-z]{2,}$/i.test(domain)){
 errors.push("APP_DOMAIN must be your real DNS hostname");
}
if(get("NEXT_PUBLIC_APP_URL")!=="https://"+domain){
 errors.push("NEXT_PUBLIC_APP_URL must exactly match https://APP_DOMAIN");
}
const cutover=get("OUTBOX_PUBLISH_FROM");
if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(cutover)
 ||!Number.isFinite(Date.parse(cutover))){
 errors.push("OUTBOX_PUBLISH_FROM must be an explicit UTC ISO-8601 timestamp");
}
if(get("TRUSTED_PROXY_COUNT") && get("TRUSTED_PROXY_COUNT")!=="1"){
 errors.push("TRUSTED_PROXY_COUNT must be 1 for the single Caddy proxy topology");
}
if(get("WOMPI_ENVIRONMENT")==="production"){
 errors.push("WOMPI production payments must not be enabled before signed sandbox E2E certification");
}
const provider=get("MEDIA_STORAGE_PROVIDER");
if(provider==="s3"){
 for(const key of ["MEDIA_STORAGE_BUCKET","MEDIA_STORAGE_ACCESS_KEY_ID","MEDIA_STORAGE_SECRET_ACCESS_KEY","MEDIA_PUBLIC_CDN_URL"]){
  if(!get(key))errors.push(key+" required for S3/R2 media");
 }
}else if(provider!=="memory"){
 errors.push("MEDIA_STORAGE_PROVIDER must be s3 or memory");
}
if(get("NOTIFICATION_DELIVERY_ENABLED")==="true"){
 if(!get("RESEND_API_KEY") && !(get("TWILIO_ACCOUNT_SID")&&get("TWILIO_API_KEY_SID")&&get("TWILIO_API_KEY_SECRET"))){
  errors.push("Notification delivery enabled without a configured provider");
 }
}
if(errors.length){
 console.error("CONTABO_PREFLIGHT_FAIL");
 errors.forEach(message=>console.error("- "+message));
 process.exit(1);
}
console.log("CONTABO_PREFLIGHT_PASS (settings syntax only, not a production security certificate)");
