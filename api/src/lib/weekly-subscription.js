// Public hosted signup link only. No subscriber addresses or provider credentials
// pass through this dashboard; confirmation and unsubscribe belong to the provider.
export function subscriptionConfig(env=process.env){
 try{const u=new URL(env.WEEKLY_SIGNUP_URL);if(u.protocol!=='https:'||u.username||u.password)throw Error();return {emailAvailable:true,signupURL:u.href};}catch{return {emailAvailable:false,signupURL:null};}
}
