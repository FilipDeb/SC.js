const puppeteer = require('puppeteer');
const XLSX = require('xlsx');

(async () => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.82 Safari/537.36');
    page.on('request', (request) => {
        const blockResources = ['image', 'stylesheet', 'font', 'script'];
        if (blockResources.includes(request.resourceType())) {
            request.abort();
        } else {
            request.continue();
        }
    });

    console.time('MyTimer');
    const allData = {};
    const kategorie = ['chemia', 'dom-i-ogrod', 'maszyny-i-utrzymanie-ciaglosci-produkcji', 'inne'];
    let index = 0;

    try {
        for (let i = 0; i < kategorie.length; i++) {

            for (let zk = 0; zk <= 200; zk++) {
                if (zk === 1) continue;

                const url = `https://aleo.com/pl/firmy/${kategorie[i]}/${zk}/?registryType=CEIDG`;
                console.log(`Ładowanie URL: ${url}`);
                await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

                const linki = await page.evaluate(() => {
                    const elements = document.querySelectorAll('.catalog-row-first-line a');
                    return Array.from(elements).map(element => element.href).filter(href => href);
                });


                await new Promise(resolve => setTimeout(resolve, 1000));


                console.log(`Znaleziono ${linki.length} linków dla kategorii ${kategorie[i]} na stronie ${zk}`);

                for (let j = 0; j < Math.min(25, linki.length); j++) {
                    await page.goto(linki[j] + '?registryType=CEIDG', { waitUntil: 'networkidle2', timeout: 60000 });

                    const wynik_nazwa = await page.evaluate(() => {
                        const nameElement = document.querySelector('#company-registry-data-section > div > div.registry-details.mt-8.ng-star-inserted > div:nth-child(6) > div > div');
                        const name = nameElement ? nameElement.innerText.trim() : null;

                        const name_opcjaElement = document.querySelector('div[_ngcontent-ng-c836696790] > div[_ngcontent-ng-c836696790] > div[_ngcontent-ng-c836696790]');
                        const name_opcja = name_opcjaElement ? name_opcjaElement.innerText.trim() : null;

                        const regex = /\d/;
                        return name && (name.startsWith('ul.') || name === 'Tak' || name === 'Nie' || name === 'Nie dotyczy' || name === ' ' || regex.test(name)) ? name_opcja : name;
                    });

                    const tel = await page.evaluate(() => {
                        const telElement = document.querySelector('#company-info-section > app-company-contact > div > div.phone.ng-star-inserted > span');
                        return telElement ? telElement.innerText.trim() : 'BRAK DANYCH';
                    });

                    const mail = await page.evaluate(() => {
                        const mailElement = document.querySelector('#company-info-section > app-company-contact > div > div.e-mail.ng-star-inserted > span');
                        return mailElement ? mailElement.innerText.trim() : 'BRAK DANYCH';
                    });

                    const kategoria_gl = await page.evaluate(() => {
                        const kategoria_glElement = document.querySelector('#company-info-section > app-category-list > div > app-company-category-strap > div');
                        return kategoria_glElement ? kategoria_glElement.innerText.trim() : 'BRAK DANYCH';
                    });

                    const pzs_kat = await page.evaluate(() => {
                        const pzs_katElement = document.querySelector('#company-info-section > app-category-list > div > app-show-more-less-text > div > div:nth-child(1)');
                        return pzs_katElement ? pzs_katElement.innerText.trim() : 'BRAK DANYCH';
                    });

                    if (!allData[kategorie[i]]) {
                        allData[kategorie[i]] = [];
                    }
                    allData[kategorie[i]].push([wynik_nazwa, tel, mail, kategoria_gl, pzs_kat]);
                    if (index === 1250) {
                        i++;
                    }
                    if (index > 1250) break;
                    index++;
                }
            }
        }

        const data = [];

        for (const kat in allData) {
            data.push([`Kategoria: ${kat}`]);
            data.push(['Imię i nazwisko', 'Numer telefonu', 'Mail', 'Kategoria główna', 'Pozostałe kategorie']);
            data.push(...allData[kat]);
            data.push([]);
        }

        const ws = XLSX.utils.aoa_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Dane');

        const columnWidths = [
            { wch: 50 }, // Imię i nazwisko
            { wch: 20 }, // Numer telefonu
            { wch: 30 }, // Mail
            { wch: 50 }, // Kategoria główna
            { wch: 50 }  // Pozostałe kategorie
        ];

        ws['!cols'] = columnWidths;

        XLSX.writeFile(wb, 'dane.xlsx');
        console.log('Dane zapisane w pliku dane.xlsx');

    } catch (error) {
        console.error('Błąd:', error);
    } finally {
        await browser.close();
    }

    console.timeEnd('MyTimer');
})();
