const express = require('express')
const client = require('prom-client')
const PORT = process.env.PORT || 8080

const app = express()
const register = new client.Registry()

app.use(express.json())

register.setDefaultLabels({
    app: 'monitor-nodejs-app'
})

client.collectDefaultMetrics({register})

const requestDuration = new client.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP request in microseconds',
    labelNames: ['method', 'route', 'code'],
})

const profileMiddleware = (req, res, next) =>{
    const start = Date.now()
    res.once('finish', () =>{
        const duration = Date.now() - start
        requestDuration
            .labels(req.method, req.url, res.statusCode)
            .observe(duration)
    })
    next()
}

app.use(profileMiddleware)

app.get('/health', (req, res) =>{
    return res.status(200).send({message: 'Healthy'})
})

app.get('/metrics', async(req, res) => {
    try{
        res.set('Content-Type', register.contentType)
        res.end(await register.metrics())
    }catch(ex){
        res.status(500).end(ex)
    }
})

app.listen(PORT, () => {
    console.log('Server running on PORT: ', PORT)
})