# UEY OCR Fixtures

These images are small, local fixtures for smoke-testing the experimental
Tesseract.js `uig` OCR path. They intentionally cover a range of OCR difficulty:
clean web text, a single rendered word, a standalone letter, book-cover
typography, and a photographed cover sample.

Content rule: these fixtures should stay neutral. Do not add political,
religious, government, military, news, protest, campaign, or personality-focused
images here.

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
- `isolated-seen.png`: PNG thumbnail derived from Wikimedia Commons,
  pfctdayelise, public domain,
  <https://commons.wikimedia.org/wiki/File:Uyghur_-_Arabic_script_-_isolated_form_-_%D8%B3_(IPA_s).svg>
- `concise-uyghur-customs-cover.jpg`: Wikimedia Commons, Chaparmen,
  CC BY-SA 4.0,
  <https://commons.wikimedia.org/wiki/File:The_Concise_Encyclopedia_of_Modern_Uyghur_Social_Customs_and_Traditions.jpg>

License and attribution details are inherited from each source file page.
