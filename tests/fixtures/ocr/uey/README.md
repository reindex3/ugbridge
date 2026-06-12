# UEY OCR Fixtures

These images are small, local fixtures for smoke-testing the experimental
Tesseract.js `uig` OCR path. They intentionally cover a range of OCR difficulty:
clean web text, a single rendered word, book-cover typography, historical
manuscript text, and a dense page sample.

Run the smoke check with:

```bash
npm run ocr:fixtures
```

The smoke script uses Tesseract's Uyghur model and asserts conservative
thresholds for confidence and Arabic-script character counts. The goal is not
perfect transcription; it is to catch broken model loading or a total OCR
regression.

Sources:

- `welcome-to-wikipedia-ug.png`: Wikimedia Commons, Zolgoyo, CC BY-SA 3.0,
  <https://commons.wikimedia.org/wiki/File:Welcome_to_Wikipedia_in_ug.png>
- `uyghurche.png`: Wikimedia Commons, Amateur55, CC BY-SA 3.0,
  <https://commons.wikimedia.org/wiki/File:Uyghurche.png>
- `concise-uyghur-customs-cover.jpg`: Wikimedia Commons, Chaparmen,
  CC BY-SA 4.0,
  <https://commons.wikimedia.org/wiki/File:The_Concise_Encyclopedia_of_Modern_Uyghur_Social_Customs_and_Traditions.jpg>
- `qutadughubiliq-wien-p10.jpg`: Wikimedia Commons, public domain,
  <https://commons.wikimedia.org/wiki/File:QutadughuBiliq_wien_p.10.jpg>
- `rarities-lam-alif.png`: Wikimedia Commons, Aminah's Alphabet Songs,
  CC BY-SA 4.0,
  <https://commons.wikimedia.org/wiki/File:Rarities_of_Lam-Alif_in_Uyghur.png>

License and attribution details are inherited from each source file page.
