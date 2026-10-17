# Batchbook

A Windows app (installable PWA) that prices a recipe and prints a cost card.

You enter what you paid for a pack and how much the recipe uses. Batchbook converts cups to the package weight, adds labour and packaging, and shows the menu price that hits your food-cost target. Pro is a one-time purchase through the Microsoft Store.

The sample cinnamon rolls cost **$9.67** in ingredients and **$13.50** in labour, **$23.17** for 12 rolls (**$1.93** each). At a **$4.50** menu price the food cost is **17.9%** and the profit is **$2.57** a roll. A 28% food-cost target would charge **$2.88**. The boxed-lunch sample suggests **$6.27** a plate to hit 30% food cost, against a **$4.51** plate cost.

## What's in the folder

| Path | What it is |
| --- | --- |
| `index.html` | The app shell |
| `css/styles.css` | Layout, including the printed cost card |
| `js/calc.js` | Cost engine (pure functions, tested) |
| `js/app.js` | Interface |
| `js/storage.js` | Local recipes, price book and shop presets |
| `js/pro.js` | Batchbook Pro via the Microsoft Store |
| `js/config.js` | **Fill in after reserving the app in Partner Center** |
| `sw.js` | Offline support |
| `manifest.webmanifest` | Name, icons, screenshots |
| `privacy.html` | Privacy policy |
| `icons/` | App icons |
| `store-assets/` | 1920×1080 screenshots and the 300×300 logo |
| `tests/` | Unit tests |

## Run it locally

```bash
cd batchbook
npm test
python -m http.server 8090
```

Open http://localhost:8090. Add `?pro=1` on localhost to preview Pro. `?sample=1` opens the cinnamon rolls. `?sample=lunch` opens the boxed lunches.

## Before publishing

1. In [Partner Center](https://partner.microsoft.com/dashboard), create the app and reserve the name **Batchbook: Recipe Cost Calculator**.
2. Copy the Store ID into `storeProductId` in `js/config.js`.
3. Add a durable add-on with product ID `batchbook_pro`, priced at $6.99. The app itself stays free.
4. Host this folder on HTTPS. GitHub Pages works.
5. Package that URL with [PWABuilder](https://www.pwabuilder.com/) for Windows and upload the package.
6. Set the privacy policy URL to `privacy.html` on the host, the category to Productivity, and upload the screenshots in `store-assets/`.
7. Submit. Purchases through the Store keep 15% as the Store fee.

`supportEmail` in `js/config.js` is already set. The purchase button only appears when the app is installed from the Store.

## Updating

Changes to HTML, CSS or JS go live on the next launch without a Store resubmission. Bump `VERSION` in `sw.js` when you ship, so the offline cache refreshes. Changes to `manifest.webmanifest` need a new package.

## What the numbers assume

Food cost percent is ingredient cost divided by the menu price. It does not include labour, packaging, overhead or tax. The suggested menu price is the ingredient cost per serving divided by your target percent.

A cup priced from a package sold by weight uses the [King Arthur Baking ingredient weight chart](https://www.kingarthurbaking.com/learn/ingredient-weight-chart) (flour 120 g, granulated sugar 198 g, packed brown sugar 213 g, confectioners' sugar 113 g, butter 226 g, table salt 288 g, instant yeast 7 g per 2¼ teaspoons). Ground cinnamon uses the USDA weight of 7.8 g per tablespoon. Type grams per cup when your ingredient differs, including kosher salt, which is not guessed. Usable percent is how much of the pack you can actually plate. This is a cost estimate, not a nutrition label.
