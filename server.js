const http = require('http');
const puppeteer = require('puppeteer');
const $ = require('cheerio');
const MongoClient = require('mongodb').MongoClient;
const sleep = require('sleep');

const url = 'https://www.google.ca/flights?lite=0#flt=YYC.MCO.2018-12-18*MCO.YYZ.2018-12-25*YYZ.YYC.2018-12-29;co:1;c:CAD;e:1;s:1;px:2,1;sd:1;t:f;tt:m';
const dburl = "mongodb://demo:P%40ssw0rd@ds131942.mlab.com:31942/flights";
const PORT = process.env.PORT || 5000;

const server = http.createServer((req, res) => {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain');
    loadPageOk();
    res.end('Hello World\n');
});

server.listen(PORT, () => {
    console.log(`Server running on ${PORT}/`);
});


function loadPageOk (){
    puppeteer.launch({headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox']}).then(async browser => {
        const page = await browser.newPage();
        await page.goto(url,{waitUntil: 'networkidle2'});
        await page.waitFor(2500);
        await page.waitFor(() => document.querySelector('#flt-progress-indicator-search > div.rdgR3WpnuxY__mux-lpi-aria-alert > span').textContent='Loaded.');
        const pageView = await page.content();
        var cheapest = $(pageView).find('div .gws-flights-results__cheapest-price').first().text().trim();
        console.log('found moving on', cheapest);
        await page.close();
        await browser.close();

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
    });

}

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



