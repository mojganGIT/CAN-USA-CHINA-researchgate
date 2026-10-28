const {app}=require("@azure/functions");
app.http("health",{methods:["GET"],authLevel:"anonymous",route:"health",handler:async()=>({jsonBody:{ok:true,service:"research-source-validator"}})});
