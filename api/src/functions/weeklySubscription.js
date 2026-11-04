import {app} from '@azure/functions';
import {subscriptionConfig} from '../lib/weekly-subscription.js';
app.http('weeklySubscription',{route:'weekly-subscription',methods:['GET'],authLevel:'anonymous',handler:async()=>({headers:{'cache-control':'no-store','x-content-type-options':'nosniff'},jsonBody:subscriptionConfig()})});
