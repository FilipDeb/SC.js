//18:06
const puppeteer = require('puppeteer');
const XLSX = require('xlsx');

(async () => {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    await page.setRequestInterception(true);

await page.setRequestInterception(true);
page.on('request', (request) => {
    if (request.resourceType() === 'image' || request.resourceType() === 'stylesheet') {
        request.abort();
    } else {
        request.continue();
    }
});
console.time('MyTimer');
    await page.goto('https://aleo.com/pl/firmy/chemia?registryType=CEIDG', { waitUntil: 'networkidle2',timeout: 60000 });
    const allData = [];
    const linksToCollectPerPage = 25; // Liczba linków do zebrania z każdej strony
    const navValues = await page.evaluate(() => {
        const navItems = document.querySelectorAll('nav ul li');
        return Array.from(navItems).map(li => {
            const link = li.querySelector('a');
            return link ? link.innerText.trim() : null; // Zbiera teksty z linków w <li>
        }).filter(text => text !== null); // Filtruje null
    });
    const numericValues = navValues.map(value => Number(value)).filter(num => !isNaN(num)); // Filtruje NaN

    // Znalezienie największej liczby
    const max = Math.max(...numericValues);
    
    console.log('Największy element w tablicy:', max);
    
    try {
        // Iteracja po dwóch stronach
        for (let zk = 0; zk <= 2; zk++) {
            if (zk === 1) continue;
            const url = `https://aleo.com/pl/firmy/chemia/${zk}?registryType=CEIDG`;
            console.log(url);
            await page.goto(url, { waitUntil: 'networkidle2',timeout: 60000 });

            const linki = await page.evaluate(() => {
                const elements = document.querySelectorAll('.catalog-row-first-line a');
                return Array.from(elements).map(element => element.href);
            });

            console.log(`Znaleziono ${linki.length} linków na stronie ${zk}.`);

            // Zbieranie danych z pierwszych 25 linków
            for (let i = 0; i < 25; i++) {
                await page.goto(linki[i] + '?registryType=CEIDG', { waitUntil: 'networkidle2',timeout: 60000 });
                
                const wynik_nazwa = await page.evaluate(() => {
                    const nameElement = document.querySelector('#company-registry-data-section > div > div.registry-details.mt-8.ng-star-inserted > div:nth-child(6) > div > div');
                    const name = nameElement ? nameElement.innerText.trim() : null;
                
                    const name_opcjaElement = document.querySelector('div[_ngcontent-ng-c836696790] > div[_ngcontent-ng-c836696790] > div[_ngcontent-ng-c836696790]');
                    const name_opcja = name_opcjaElement ? name_opcjaElement.innerText.trim() : null;
                    const regex = /\d/;
                    return name && (name.startsWith('ul.') || name === 'Tak' || name === 'Nie' || regex.test(name) || name==='Nie dotyczy') ? name_opcja : name;
                });

                const tel = await page.evaluate(() => {
                    const telElement = document.querySelector('#company-info-section > app-company-contact > div > div.phone.ng-star-inserted > span');
                    return telElement ? telElement.innerText.trim() : null;
                });

                const mail = await page.evaluate(() => {
                    const mailElement = document.querySelector('#company-info-section > app-company-contact > div > div.e-mail.ng-star-inserted > span');
                    return mailElement ? mailElement.innerText.trim() : null;
                });

                const kategoria_gl = await page.evaluate(() => {
                    const kategoria_glElement = document.querySelector('#company-info-section > app-category-list > div > app-company-category-strap > div');
                    return kategoria_glElement ? kategoria_glElement.innerText.trim() : null;
                });

                const pzs_kat = await page.evaluate(() => {
                    const pzs_katElement = document.querySelector('#company-info-section > app-category-list > div > app-show-more-less-text > div > div:nth-child(1)');
                    return pzs_katElement ? pzs_katElement.innerText.trim() : null;
                });

                allData.push([wynik_nazwa || 'BRAK DANYCH', tel || 'BRAK DANYCH', mail || 'BRAK DANYCH', kategoria_gl || 'BRAK DANYCH', pzs_kat || 'BRAK DANYCH']);
            }
        }

        const data = [
            ['Imię i nazwisko', 'Numer telefonu', 'Mail', 'Kategoria główna', 'Pozostałe kategorie'],
            ...allData
        ];

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

        // Zapisz plik
        XLSX.writeFile(wb, 'dane.xlsx');
        console.log('Dane zapisane w pliku dane.xlsx');

    } catch (error) {
        console.error('Błąd:', error);
    } finally {
        await browser.close();
    }
    console.timeEnd('MyTimer');
})();
