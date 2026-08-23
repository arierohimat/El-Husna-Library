const http = require('http');
const req = http.request('http://localhost:3000/api/monitoring?kelas=VII-A', {
    headers: { 'Cookie': 'session={"userId":"cmkvcht800003uqwwk2jty1p2","email":"walikelas@elhusna.com","role":"WALIKELAS","kelas":"VII-A"}' }
}, res => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => console.log(data));
});
req.end();
