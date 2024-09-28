//19:04
const puppeteer = require('puppeteer');
const XLSX = require('xlsx');

(async () => {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    
    page.on('request', (request) => {
        if (request.resourceType() === 'image' || request.resourceType() === 'stylesheet') {
            request.abort();
        } else {
            request.continue();
        }
    });
    
    console.time('MyTimer');
    await page.goto('https://aleo.com/pl/firmy/chemia?registryType=CEIDG', { waitUntil: 'networkidle2', timeout: 60000 });
    
    const allData = {};
    
    try {
        const kategorie = ['chemia', 'dom-i-ogrod', 'maszyny-i-utrzymanie-ciaglosci-produkcji', 'inne'];
        
        for (let i = 0; i < kategorie.length; i++) {
            const url = `https://aleo.com/pl/firmy/${kategorie[i]}/0?registryType=CEIDG`;
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

            const linki = await page.evaluate(() => {
                const elements = document.querySelectorAll('.catalog-row-first-line a');
                return Array.from(elements).map(element => element.href);
            });

            console.log(`Znaleziono ${linki.length} linków dla kategorii ${kategorie[i]}:`, linki);

            const navValues = await page.evaluate(() => {
                const navItems = document.querySelectorAll('li');
                return Array.from(navItems).map(li => {
                    const link = li.querySelector('a');
                    return link ? link.innerText.trim() : null;
                }).filter(text => text !== null);
            });

            const numericValues = navValues.map(value => Number(value)).filter(num => !isNaN(num));
            const max = Math.max(...numericValues);
            console.log(`Największa liczba w kategorii ${kategorie[i]}:`, max);
            
            // Zbieranie danych z pierwszych 25 linków
            for (let zk = 0; zk <= max; zk++) {
                if (zk === 1) continue;
            for (let j = 0; j < Math.min(25, linki.length); j++) {
                await page.goto(linki[j] + '?registryType=CEIDG', { waitUntil: 'networkidle2', timeout: 60000 });
                
                const wynik_nazwa = await page.evaluate(() => {
                    const nameElement = document.querySelector('#company-registry-data-section > div > div.registry-details.mt-8.ng-star-inserted > div:nth-child(6) > div > div');
                    return nameElement ? nameElement.innerText.trim() : 'BRAK DANYCH';
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

                // Przechowywanie danych w obiekcie
                if (!allData[kategorie[i]]) {
                    allData[kategorie[i]] = [];
                }
                allData[kategorie[i]].push([wynik_nazwa, tel, mail, kategoria_gl, pzs_kat]);
            }
        }
    }

        const data = [];
        
        for (const kat in allData) {
            data.push([`Kategoria: ${kat}`]); // Dodaj tytuł kategorii
            data.push(['Imię i nazwisko', 'Numer telefonu', 'Mail', 'Kategoria główna', 'Pozostałe kategorie']); // Nagłówki
            data.push(...allData[kat]); // Dodaj zebrane dane
            data.push([]); // Dodaj pusty wiersz między kategoriami
        }
        
        // Zapisz do arkusza
        const ws = XLSX.utils.aoa_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Dane');
        
        // Ustawienia szerokości kolumn
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
