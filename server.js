const http = require('http');
const puppeteer = require('puppeteer');
const $ = require('cheerio');
const MongoClient = require('mongodb').MongoClient;
const sleep = require('sleep');
var schedule = require('node-schedule');
var currencyFormatter = require('currency-formatter');

const url = 'https://www.google.ca/flights?lite=0#flt=YYC.MCO.2018-12-18*MCO.YYZ.2018-12-25*YYZ.YYC.2018-12-29;co:1;c:CAD;e:1;s:1;px:2,1;sd:1;t:f;tt:m';
const dburl = "mongodb://demo:P%40ssw0rd@ds131942.mlab.com:31942/flights";
const PORT = process.env.PORT || 5030;

const server = http.createServer((req, res) => {
    //console.log(currencyFormatter.unformat('CA$1,022.50', { code: 'USD' }))
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html');
    loadPageOk(res);
});

server.listen(PORT, () => {
    console.log(`Server running on ${PORT}/`);
});


//var j = schedule.scheduleJob('09 * * * *', function(){
 //   loadPageOk();
//});


function loadPageOk (res){
    puppeteer.launch({headless: true,slowMo: 250, args: ['--no-sandbox', '--disable-setuid-sandbox']}).then(async browser => {
        const page = await browser.newPage();
        await page.goto(url,{waitUntil: 'networkidle2'});
        await page.waitFor(2500);
        await page.waitFor(() => document.querySelector('#flt-progress-indicator-search > div.rdgR3WpnuxY__mux-lpi-aria-alert > span').textContent='Loaded.');
        const pageView = await page.content();
        var cheapest = $(pageView).find('div .gws-flights-results__cheapest-price').first().text().trim();
        res.write('found value - ', cheapest);
        await page.close();
        await browser.close();

        if (cheapest) {
            MongoClient.connect(dburl, {useNewUrlParser: true}, function (err, client) {
                if (err) {
                    res.write('An error occurred connecting to MongoDB: ', err,"\n");

                } else {
                    var db = client.db('flights');
                    const thisTime = Date.now();
                    db.collection('pricelist').insertOne({
                        insertTime: new Date(),
                        milliSince:  thisTime,
                        price: currencyFormatter.unformat(cheapest, { code: 'USD' })
                    });
                    res.write('inserted\n');
                }
                res.end('Done\n');
            });
        } else {
            res.write('cheapset is null\n');
            res.end('Done\n');
        }

    });

}
/*
function onRequest(){
    console.log('Hello flights');
    puppeteer
        .launch({args: ['--no-sandbox', '--disable-setuid-sandbox']})
        .then(function (browser) {
            console.log('return browser.newPage() - done');

            return browser.newPage();
        })
        .then(function (page) {
            return page.goto(url, { waitUntil: 'networkidle2' }).then(function () {

                console.log('return page.content() - done');
                page.waitForSelector('gws-flights-results__best-price-info');
                return page.content();
            });
        })
        .then(function (html) {
            var cheapest = $(html).find('div .gws-flights-results__cheapest-price').first().text().trim();
            var loaded = $(html).find('#flt-progress-indicator-search > div.rdgR3WpnuxY__mux-lpi-aria-alert').first().text().trim();
            console.log('loaded ',loaded);
            return cheapest;
        })
        .then(function (cheapest) {
            console.log(cheapest);

            if (cheapest) {
                MongoClient.connect(dburl, {useNewUrlParser: true}, function (err, client) {
                    if (err) {
                        console.log('An error occurred connecting to MongoDB: ', err);

                    } else {
                        var db = client.db('flights');
                        db.collection('pricelist').insertOne({
                            when: new Date(),
                            price: cheapest
                        });
                        console.log('inserted');
                    }
                    sleep.sleep(10);
                });
            } else {
                console.log('cheapset is null');
            }

        })
        .catch(function (err) {
            //handle error
            console.log(err);

            sleep.sleep(10);
           // process.exit(0);

        });

   // response.end();
}

*/

