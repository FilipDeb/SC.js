const puppeteer = require('puppeteer');
const XLSX = require('xlsx');
(async () => {
    const browser = await puppeteer.launch({ headless: false }); // Wyłącz tryb headless
    const page = await browser.newPage();

    try {
        await page.goto('https://aleo.com/pl/firma/piotr-herda-ligota', { waitUntil: 'networkidle2' });
        await page.waitForSelector('body'); // Czeka na załadowanie ciała strony

        // Pobierz imię i nazwisko z podanego selektora
        const name = await page.evaluate(() => {
            const nameElement = document.querySelector('#company-registry-data-section > div > div.registry-details.mt-8.ng-star-inserted > div:nth-child(6) > div > div');
            return nameElement ? nameElement.innerText.trim() : null;
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

      // Przygotuj dane do zapisu
      const data = [
        ['Imię i nazwisko', 'Numer telefonu', 'Mail', 'Kategoria główna', 'Pozostałe kategorie'],
        [name || 'N/A', tel || 'N/A', mail || 'N/A', kategoria_gl || 'N/A', pzs_kat || 'N/A']
    ];

    // Tworzenie arkusza i książki roboczej
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Dane');

    // Dostosowanie szerokości kolumn do zawartości
    const columnWidths = [
        { wch: 25 }, // Imię i nazwisko
        { wch: 20 }, // Numer telefonu
        { wch: 30 }, // Mail
        { wch: 30 }, // Kategoria główna
        { wch: 30 }  // Pozostałe kategorie
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
})();
