const { Telegraf, session, Scenes, Markup } = require('telegraf')
const TelegrafI18n = require('telegraf-i18n')

require('dotenv').config();
const path = require('path');
const mongoose = require('mongoose');
const { Schema } = mongoose;
const { CryptoPay, Assets, PaidButtonNames } = require('@foile/crypto-pay-api');

const cryptoPay = new CryptoPay(process.env.CRYPTO_TESTNET_BOT_TOKEN, {
  hostname: 'testnet-pay.crypt.bot',
  protocol: 'https'
});

const bot = new Telegraf(process.env.BOT_TOKEN)

const i18n = new TelegrafI18n({
  defaultLanguage: 'en',
  useSession: true,
  defaultLanguageOnMissing: true,
  directory: path.resolve(__dirname, 'locales')
})

//bot.use(Telegraf.session)
bot.use(i18n.middleware())

//==============================================

const userSchema = new Schema({
  telegramId: Number,
  balance: Number,
  preferences: { type: Map, of: [String] },
  orders: []
})

const User = mongoose.model('User', userSchema);
//==============================================

//starting message
bot.start(async (ctx) => {
  //console.log(await cryptoPay.getMe());
  await mongoose.connect(process.env.DB_CONNECTION_STRING);
  let currentUserId = ctx.update.message.from.id;
  let user = await User.findOne({ telegramId: currentUserId });

  if (user == null) {
    user = new User({
      telegramId: currentUserId,
      balance: 0,
      preferences: {
        basepref: [],
        foodPrefs: [],
        spicyPrefs: [],
        sweetWaterPrefs: [],
        juicePrefs: [],
        hotDrinksPrefs: [],
        pizzaSizePref: [],
        pizzaTypePref: [],
        pizzaIngredientNonPref: [],
        pizzaSnackPref: [],
        pizzaDessertPref: [],
        burgerSizePref: [],
        burgerMeatPref: [],
        burgerSnackPref: [],
        saucePref: [],
        burgerDessert: [],
        sushiPref: [],
        seafoodPref: [],
        asianSoupPref: [],
        wokBasePref: [],
        wokFillingPref: [],
      },
      orders: []
    });
    await user.save();
  }

  const message = ctx.i18n.t('greeting');
  ctx.reply(
    message,
    Markup.keyboard([
      //'HIW',
      'Menu'
    ]))

  await mongoose.disconnect();
}
)

//Main menu
bot.hears('Menu', async (ctx) => {
  await mongoose.connect(process.env.DB_CONNECTION_STRING);
  let currentUserId = ctx.update.message.from.id;
  let user = await User.findOne({ telegramId: currentUserId });


  const message = ctx.i18n.t('balance', { balance: user?.balance ?? 0 });
  ctx.reply(message,
    Markup.inlineKeyboard(
      [
        [Markup.button.callback(ctx.i18n.t('menu.preferences'), 'pref')],
        [Markup.button.callback(ctx.i18n.t('menu.myself'), 'order')],
        //[Markup.button.callback('Send to fiend', 'send_frend')],
        [Markup.button.callback(ctx.i18n.t('menu.purchase'), 'purchase')],
        //[Markup.button.callback('History', 'history')]
      ]));

  await mongoose.disconnect();
}
)

//Preference
bot.action('pref', (ctx) =>
  ctx.reply(ctx.i18n.t('ask_preferences.text'),
    Markup.inlineKeyboard(
      [
        [Markup.button.callback(ctx.i18n.t('ask_preferences.base_pref'), 'basePref')],
        [Markup.button.callback(ctx.i18n.t('ask_preferences.categories'), 'categoriesAndBrands')],
        [Markup.button.callback(ctx.i18n.t('ask_preferences.brands'), 'categoryOptions')]
      ])))

//Order
bot.action('order', (ctx) => {
  ctx.reply('Укажи адрес доставки')
  bot.on('text', async (ctx) => {
    let currentUserId = ctx.update.message.from.id;
    let address = ctx.message.text
    //save order into db
    await mongoose.connect(process.env.DB_CONNECTION_STRING);
    let user = await User.findOne({ telegramId: currentUserId });
    user.orders.push({ date: new Date(), address: address });
    user.balance--;
    await user.save();

    ctx.reply('Ожидайте доставку по указанному адресу')
  }
  )
}
)

//Purchace
bot.action('purchase', async (ctx) => {
  ctx.reply(ctx.i18n.t('purchase.refill'))
  await mongoose.connect(process.env.DB_CONNECTION_STRING);
  let currentUserId = ctx.update.callback_query.from.id;
  let user = await User.findOne({ telegramId: currentUserId });
  if (user == null) {
    return;
  }

  var invoice = await cryptoPay.createInvoice(Assets.TON, 0.01, {
    description: 'balance top up',
    paid_btn_name: PaidButtonNames.OPEN_BOT,
    paid_btn_url: process.env.BOT_URL,
  })
  //console.log(invoice)
  ctx.reply(invoice.pay_url)
  user.balance++;
  user.save();
}
)

//Base preference section
bot.action('basePref', (ctx) =>
  ctx.reply(ctx.i18n.t('basepref.never'),
    Markup.inlineKeyboard(
      [
        [Markup.button.callback(ctx.i18n.t('basepref.pork'), 'toggleCheckbox_basepref_pork')],
        [Markup.button.callback(ctx.i18n.t('basepref.beef'), 'toggleCheckbox_basepref_beef')],
        [Markup.button.callback(ctx.i18n.t('basepref.chicken'), 'toggleCheckbox_basepref_chichen')],
        [Markup.button.callback(ctx.i18n.t('basepref.fish'), 'toggleCheckbox_basepref_fish')],
        [Markup.button.callback(ctx.i18n.t('basepref.onion'), 'toggleCheckbox_basepref_onion')],
        [Markup.button.callback(ctx.i18n.t('basepref.fried'), 'toggleCheckbox_basepref_friedfood')],
        [Markup.button.callback(ctx.i18n.t('accept'), 'basepref_apply')],
        [Markup.button.callback(ctx.i18n.t('back'), 'pref')]
      ])))

//foodprefs
bot.action('basepref_apply', async (ctx) => {
  await setPreviousStepMultichoices(ctx);
  ctx.reply(ctx.i18n.t('foodprefs.character'),
    Markup.inlineKeyboard(
      [
        [Markup.button.callback(ctx.i18n.t('foodprefs.newest'), 'foodPrefs_newest')],
        [Markup.button.callback(ctx.i18n.t('foodprefs.ready'), 'foodPrefs_ready')],
        [Markup.button.callback(ctx.i18n.t('foodprefs.classic'), 'foodPrefs_classic')],
        [Markup.button.callback(ctx.i18n.t('foodprefs.new'), 'foodPrefs_new')]
      ]))
}
)

//spicyprefs
bot.action(getRegexWithBackButtonExclude('foodPrefs', 'drinkprefs_back'), async (ctx) => {
  await setPreviousChoice(ctx);
  ctx.reply(ctx.i18n.t('spicyprefs.text'),
    Markup.inlineKeyboard(
      [
        [Markup.button.callback(ctx.i18n.t('spicyprefs.fan'), 'spicyPrefs_fanat')],
        [Markup.button.callback(ctx.i18n.t('spicyprefs.pleasure'), 'spicyPrefs_pleasure')],
        [Markup.button.callback(ctx.i18n.t('spicyprefs.betternot'), 'spicyPrefs_betternot')],
        [Markup.button.callback(ctx.i18n.t('spicyprefs.no'), 'spicyPrefs_no')]
      ]))
}
)

//drinkprefs
bot.action(getRegexWithBackButtonExclude('spicyPrefs', 'sweetWaterPrefs_back'), async (ctx) => {
  await setPreviousChoice(ctx);
  ctx.reply(ctx.i18n.t('drinkprefs.text'),
    Markup.inlineKeyboard(
      [
        [Markup.button.callback(ctx.i18n.t('drinkprefs.sweetwater'), 'toggleCheckbox_drinkprefs_sweetwater')],
        [Markup.button.callback(ctx.i18n.t('drinkprefs.compote'), 'toggleCheckbox_drinkprefs_compote')],
        [Markup.button.callback(ctx.i18n.t('drinkprefs.water'), 'toggleCheckbox_drinkprefs_water')],
        [Markup.button.callback(ctx.i18n.t('drinkprefs.fruitdrink'), 'toggleCheckbox_drinkprefs_fruitdrink')],
        [Markup.button.callback(ctx.i18n.t('drinkprefs.hotdrink'), 'toggleCheckbox_drinkprefs_hotdrink')],
        [Markup.button.callback(ctx.i18n.t('accept'), 'drinkprefs_apply')],
        [Markup.button.callback(ctx.i18n.t('back'), 'drinkprefs_back')]
      ]))
}
)

//sweetwaterprefs
bot.action(/(drinkprefs_apply)|(juicePrefs_back)/, async (ctx) => {
  await setPreviousStepMultichoices(ctx);
  ctx.reply(ctx.i18n.t('sweetwaterprefs.text'),
    Markup.inlineKeyboard(
      [
        [Markup.button.callback(ctx.i18n.t('sweetwaterprefs.coke'), 'sweetWaterPrefs_coke')],
        [Markup.button.callback(ctx.i18n.t('sweetwaterprefs.fanta'), 'sweetWaterPrefs_fanta')],
        [Markup.button.callback(ctx.i18n.t('sweetwaterprefs.sprite'), 'sweetWaterPrefs_sprite')],
        [Markup.button.callback(ctx.i18n.t('sweetwaterprefs.fusetea'), 'sweetWaterPrefs_fusetea')],
        [Markup.button.callback(ctx.i18n.t('back'), 'sweetWaterPrefs_back')]
      ]))
}
)

//juiceprefs
bot.action(getRegexWithBackButtonExclude('sweetWaterPrefs', 'hotDrinksPrefs_back'), async (ctx) => {
  await setPreviousChoice(ctx);
  ctx.reply(ctx.i18n.t('juiceprefs.text'),
    Markup.inlineKeyboard(
      [
        [Markup.button.callback(ctx.i18n.t('juiceprefs.apple'), 'juicePrefs_apple')],
        [Markup.button.callback(ctx.i18n.t('juiceprefs.cherry'), 'juicePrefs_cherry')],
        [Markup.button.callback(ctx.i18n.t('juiceprefs.orange'), 'juicePrefs_orange')],
        [Markup.button.callback(ctx.i18n.t('juiceprefs.tomato'), 'juicePrefs_tomato')],
        [Markup.button.callback(ctx.i18n.t('juiceprefs.grape'), 'juicePrefs_grape')],
        [Markup.button.callback(ctx.i18n.t('back'), 'juicePrefs_back')]
      ]))
}
)

//hotdrinksprefs
bot.action(getRegexWithBackButtonExclude('juicePrefs'), async (ctx) => {
  await setPreviousChoice(ctx);
  ctx.reply(ctx.i18n.t('hotdrinksprefs.text'),
    Markup.inlineKeyboard(
      [
        [Markup.button.callback(ctx.i18n.t('hotdrinksprefs.tea'), 'hotDrinksPrefs_tea')],
        [Markup.button.callback(ctx.i18n.t('hotdrinksprefs.punsh'), 'hotDrinksPrefs_punsh')],
        [Markup.button.callback(ctx.i18n.t('hotdrinksprefs.americano'), 'hotDrinksPrefs_americano')],
        [Markup.button.callback(ctx.i18n.t('hotdrinksprefs.cappuchino'), 'hotDrinksPrefs_cappuchino')],
        [Markup.button.callback(ctx.i18n.t('hotdrinksprefs.latte'), 'hotDrinksPrefs_latte')],
        [Markup.button.callback(ctx.i18n.t('back'), 'hotDrinksPrefs_back')]
      ]))
}
)

bot.action(getRegexWithBackButtonExclude('hotDrinksPrefs'), async (ctx) => {
  await setPreviousChoice(ctx);
  ctx.reply(ctx.i18n.t('basepref_thanks.text'),
    Markup.inlineKeyboard(
      [
        [Markup.button.callback(ctx.i18n.t('basepref_thanks.preferences'), 'basePref')],
        [Markup.button.callback(ctx.i18n.t('basepref_thanks.categories'), 'categoriesAndBrands')],
        [Markup.button.callback(ctx.i18n.t('basepref_thanks.brands'), 'categoryOptions')]
      ]))
}
)

//Brand preference section

//Brand options section
bot.action('categoryOptions', (ctx) =>
  ctx.reply(ctx.i18n.t('brandpref.text'),
    Markup.inlineKeyboard(
      [
        [Markup.button.callback(ctx.i18n.t('brandpref.pizza'), 'pizzaSizePref')],
        [Markup.button.callback(ctx.i18n.t('brandpref.burger'), 'burgerPref')],
        [Markup.button.callback(ctx.i18n.t('brandpref.sushi'), 'sushiPref')],
        [Markup.button.callback(ctx.i18n.t('back'), 'pref')]
      ])))

//Pizza Preference section
bot.action('pizzaSizePref', (ctx) =>
  ctx.reply(ctx.i18n.t('pizzaSizePref.text'),
    Markup.inlineKeyboard(
      [
        [Markup.button.callback(ctx.i18n.t('pizzaSizePref.little'), 'pizzaSizePref_little')],
        [Markup.button.callback(ctx.i18n.t('pizzaSizePref.medium'), 'pizzaSizePref_medium')],
        [Markup.button.callback(ctx.i18n.t('pizzaSizePref.large'), 'pizzaSizePref_large')],
        [Markup.button.callback(ctx.i18n.t('pizzaSizePref.any'), 'pizzaSizePref_any')],
        [Markup.button.callback(ctx.i18n.t('back'), 'pref')]
      ])))

//Pizza type
bot.action(getRegexWithBackButtonExclude('pizzaSizePref', 'pizzaIngredientNonPref_back'), async (ctx) => {
  await setPreviousChoice(ctx);
  ctx.reply(ctx.i18n.t('pizzaTypePref.text'),
    Markup.inlineKeyboard(
      [
        [Markup.button.callback(ctx.i18n.t('pizzaTypePref.meat'), 'pizzaTypePref_meat')],
        [Markup.button.callback(ctx.i18n.t('pizzaTypePref.pepperoni'), 'pizzaTypePref_pepperoni')],
        [Markup.button.callback(ctx.i18n.t('pizzaTypePref.cheese'), 'pizzaTypePref_cheese')],
        [Markup.button.callback(ctx.i18n.t('pizzaTypePref.margarita'), 'pizzaTypePref_margarita')],
        [Markup.button.callback(ctx.i18n.t('pizzaTypePref.vegetables'), 'pizzaTypePref_vegetables')],
        [Markup.button.callback(ctx.i18n.t('pizzaTypePref.any'), 'pizzaTypePref_any')],
        [Markup.button.callback(ctx.i18n.t('back'), 'pizzaSizePref')]
      ]))
}
)

bot.action(getRegexWithBackButtonExclude('pizzaTypePref', 'pizzaSnackPref_back'), async (ctx) => {
  setPreviousChoice(ctx);
  ctx.reply(ctx.i18n.t('pizzaIngredientNonPref.text'),
    Markup.inlineKeyboard(
      [
        [Markup.button.callback(ctx.i18n.t('pizzaIngredientNonPref.porkbacon'), 'toggleCheckbox_pizzaIngredientNonPref_porkbacon')],
        [Markup.button.callback(ctx.i18n.t('pizzaIngredientNonPref.onion'), 'toggleCheckbox_pizzaIngredientNonPref_onion')],
        [Markup.button.callback(ctx.i18n.t('pizzaIngredientNonPref.olives'), 'toggleCheckbox_pizzaIngredientNonPref_olives')],
        [Markup.button.callback(ctx.i18n.t('pizzaIngredientNonPref.chicken'), 'toggleCheckbox_pizzaIngredientNonPref_chicken')],
        [Markup.button.callback(ctx.i18n.t('pizzaIngredientNonPref.fruites'), 'toggleCheckbox_pizzaIngredientNonPref_fruites')],
        [Markup.button.callback(ctx.i18n.t('pizzaIngredientNonPref.beef'), 'toggleCheckbox_pizzaIngredientNonPref_beef')],
        [Markup.button.callback(ctx.i18n.t('pizzaIngredientNonPref.sausage'), 'toggleCheckbox_pizzaIngredientNonPref_sausage')],
        [Markup.button.callback(ctx.i18n.t('accept'), 'pizzaIngredientNonPref_apply')],
        [Markup.button.callback(ctx.i18n.t('back'), 'pizzaIngredientNonPref_back')]
      ]))
}
)

bot.action(/pizzaIngredientNonPref_apply|pizzaDessertPref_back/, async (ctx) => {
  await setPreviousStepMultichoices(ctx);
  ctx.reply(ctx.i18n.t('pizzaSnackPref.text'),
    Markup.inlineKeyboard(
      [
        [Markup.button.callback(ctx.i18n.t('pizzaSnackPref.chickenroll'), 'toggleCheckbox_pizzaSnackPref_chickenroll')],
        [Markup.button.callback(ctx.i18n.t('pizzaSnackPref.salad'), 'toggleCheckbox_pizzaSnackPref_salad')],
        [Markup.button.callback(ctx.i18n.t('pizzaSnackPref.potato'), 'toggleCheckbox_pizzaSnackPref_potato')],
        [Markup.button.callback(ctx.i18n.t('pizzaSnackPref.pasta'), 'toggleCheckbox_pizzaSnackPref_pasta')],
        [Markup.button.callback(ctx.i18n.t('pizzaSnackPref.dough'), 'toggleCheckbox_pizzaSnackPref_dough')],
        [Markup.button.callback(ctx.i18n.t('pizzaSnackPref.nosnack'), 'toggleCheckbox_pizzaSnackPref_nosnack')],
        [Markup.button.callback(ctx.i18n.t('accept'), 'pizzaSnackPref_apply')],
        [Markup.button.callback(ctx.i18n.t('back'), 'pizzaSnackPref_back')]
      ]))
}
)

bot.action('pizzaSnackPref_apply', async (ctx) => {
  await setPreviousStepMultichoices(ctx);
  ctx.reply(ctx.i18n.t('pizzaDessertPref.text'),
    Markup.inlineKeyboard(
      [
        [Markup.button.callback(ctx.i18n.t('pizzaDessertPref.cheesecake'), 'toggleCheckbox_pizzaDessertPref_cheesecake')],
        [Markup.button.callback(ctx.i18n.t('pizzaDessertPref.sweetdough'), 'toggleCheckbox_pizzaDessertPref_sweetdough')],
        [Markup.button.callback(ctx.i18n.t('pizzaDessertPref.choco'), 'toggleCheckbox_pizzaDessertPref_choco')],
        [Markup.button.callback(ctx.i18n.t('pizzaDessertPref.pancheesecake'), 'toggleCheckbox_pizzaDessertPref_pancheesecake')],
        [Markup.button.callback(ctx.i18n.t('pizzaDessertPref.milk'), 'toggleCheckbox_pizzaDessertPref_milk')],
        [Markup.button.callback(ctx.i18n.t('pizzaDessertPref.nodessert'), 'toggleCheckbox_pizzaDessertPref_nodessert')],
        [Markup.button.callback(ctx.i18n.t('accept'), 'pizzaDessertPref_apply')],
        [Markup.button.callback(ctx.i18n.t('back'), 'pizzaDessertPref_back')]
      ]))
}
)

bot.action('pizzaDessertPref_apply', async (ctx) => {
  await setPreviousStepMultichoices(ctx);
  ctx.reply(ctx.i18n.t('brandpref.text'),
    Markup.inlineKeyboard(
      [
        [Markup.button.callback(ctx.i18n.t('brandpref.pizza'), 'pizzaSizePref')],
        [Markup.button.callback(ctx.i18n.t('brandpref.burger'), 'burgerPref')],
        [Markup.button.callback(ctx.i18n.t('brandpref.sushi'), 'sushiPref')],
        [Markup.button.callback(ctx.i18n.t('back'), 'pref')]
      ]))
}
)

//Burger Preference section
bot.action(/(burgerPref)|(burgerMeatPref_back)/, (ctx) => {
  ctx.reply(ctx.i18n.t('burgerSizePref.text'),
    Markup.inlineKeyboard(
      [
        [Markup.button.callback(ctx.i18n.t('burgerSizePref.s'), 'burgerSizePref_s')],
        [Markup.button.callback(ctx.i18n.t('burgerSizePref.m'), 'burgerSizePref_m')],
        [Markup.button.callback(ctx.i18n.t('burgerSizePref.l'), 'burgerSizePref_l')],
        [Markup.button.callback(ctx.i18n.t('burgerSizePref.xl'), 'burgerSizePref_xl')],
        [Markup.button.callback(ctx.i18n.t('burgerSizePref.any'), 'burgerSizePref_any')],
        [Markup.button.callback(ctx.i18n.t('back'), 'pref')]
      ]))
}
)

bot.action(getRegexWithBackButtonExclude('burgerSizePref', 'burgerSnackPref_back'), async (ctx) => {
  await setPreviousChoice(ctx);
  ctx.reply(ctx.i18n.t('burgerMeatPref.text'),
    Markup.inlineKeyboard(
      [
        [Markup.button.callback(ctx.i18n.t('burgerMeatPref.beef'), 'toggleCheckbox_burgerMeatPref_beef')],
        [Markup.button.callback(ctx.i18n.t('burgerMeatPref.pork'), 'toggleCheckbox_burgerMeatPref_pork')],
        [Markup.button.callback(ctx.i18n.t('burgerMeatPref.chicken'), 'toggleCheckbox_burgerMeatPref_chicken')],
        [Markup.button.callback(ctx.i18n.t('burgerMeatPref.mutton'), 'toggleCheckbox_burgerMeatPref_mutton')],
        [Markup.button.callback(ctx.i18n.t('burgerMeatPref.fish'), 'toggleCheckbox_burgerMeatPref_fish')],
        [Markup.button.callback(ctx.i18n.t('burgerMeatPref.shrimp'), 'toggleCheckbox_burgerMeatPref_shrimp')],
        [Markup.button.callback(ctx.i18n.t('burgerMeatPref.any'), 'toggleCheckbox_burgerMeatPref_any')],
        [Markup.button.callback(ctx.i18n.t('accept'), 'burgerMeatPref_apply')],
        [Markup.button.callback(ctx.i18n.t('back'), 'burgerMeatPref_back')]
      ]))
}
)

bot.action(/burgerMeatPref_apply|saucePref_back/, async (ctx) => {
  await setPreviousStepMultichoices(ctx);
  ctx.reply(ctx.i18n.t('burgerSnackPref.text'),
    Markup.inlineKeyboard(
      [
        [Markup.button.callback(ctx.i18n.t('burgerSnackPref.chips'), 'toggleCheckbox_burgerSnackPref_chips')],
        [Markup.button.callback(ctx.i18n.t('burgerSnackPref.potat'), 'toggleCheckbox_burgerSnackPref_potat')],
        [Markup.button.callback(ctx.i18n.t('burgerSnackPref.onion'), 'toggleCheckbox_burgerSnackPref_onion')],
        [Markup.button.callback(ctx.i18n.t('burgerSnackPref.nuggets'), 'toggleCheckbox_burgerSnackPref_nuggets')],
        [Markup.button.callback(ctx.i18n.t('burgerSnackPref.shrimps'), 'toggleCheckbox_burgerSnackPref_shrimps')],
        [Markup.button.callback(ctx.i18n.t('burgerSnackPref.strips'), 'toggleCheckbox_burgerSnackPref_strips')],
        [Markup.button.callback(ctx.i18n.t('burgerSnackPref.wings'), 'toggleCheckbox_burgerSnackPref_wings')],
        [Markup.button.callback(ctx.i18n.t('burgerSnackPref.nosnack'), 'toggleCheckbox_burgerSnackPref_nosnack')],
        [Markup.button.callback(ctx.i18n.t('accept'), 'burgerSnackPref_apply')],
        [Markup.button.callback(ctx.i18n.t('back'), 'burgerSnackPref_back')]
      ]))
}
)

bot.action(/burgerSnackPref_apply|burgerDessert_back/, async (ctx) => {
  await setPreviousStepMultichoices(ctx);
  ctx.reply(ctx.i18n.t('saucePref.text'),
    Markup.inlineKeyboard(
      [
        [Markup.button.callback(ctx.i18n.t('saucePref.cheese'), 'toggleCheckbox_saucePref_cheese')],
        [Markup.button.callback(ctx.i18n.t('saucePref.sweetsour'), 'toggleCheckbox_saucePref_sweetsour')],
        [Markup.button.callback(ctx.i18n.t('saucePref.hot'), 'toggleCheckbox_saucePref_hot')],
        [Markup.button.callback(ctx.i18n.t('saucePref.teriyaki'), 'toggleCheckbox_saucePref_teriyaki')],
        [Markup.button.callback(ctx.i18n.t('saucePref.ketchup'), 'toggleCheckbox_saucePref_ketchup')],
        [Markup.button.callback(ctx.i18n.t('saucePref.barbeque'), 'toggleCheckbox_saucePref_barbeque')],
        [Markup.button.callback(ctx.i18n.t('saucePref.mustard'), 'toggleCheckbox_saucePref_mustard')],
        [Markup.button.callback(ctx.i18n.t('saucePref.nosauce'), 'toggleCheckbox_saucePref_nosauce')],
        [Markup.button.callback(ctx.i18n.t('accept'), 'saucePref_apply')],
        [Markup.button.callback(ctx.i18n.t('back'), 'saucePref_back')]
      ]))
}
)

bot.action('saucePref_apply', async (ctx) => {
  await setPreviousStepMultichoices(ctx);
  ctx.reply(ctx.i18n.t('burgerDessert.text'),
    Markup.inlineKeyboard(
      [
        [Markup.button.callback(ctx.i18n.t('burgerDessert.ice'), 'burgerDessert_ice')],
        [Markup.button.callback(ctx.i18n.t('burgerDessert.pies'), 'burgerDessert_pies')],
        [Markup.button.callback(ctx.i18n.t('burgerDessert.cake'), 'burgerDessert_cake')],
        [Markup.button.callback(ctx.i18n.t('burgerDessert.muffins'), 'burgerDessert_muffins')],
        [Markup.button.callback(ctx.i18n.t('back'), 'burgerDessert_back')]
      ]))
}
)

bot.action(getRegexWithBackButtonExclude('burgerDessert'), async (ctx) => {
  await setPreviousChoice(ctx);
  ctx.reply(ctx.i18n.t('brandpref.text'),
    Markup.inlineKeyboard(
      [
        [Markup.button.callback(ctx.i18n.t('brandpref.pizza'), 'pizzaSizePref')],
        [Markup.button.callback(ctx.i18n.t('brandpref.burger'), 'burgerPref')],
        [Markup.button.callback(ctx.i18n.t('brandpref.sushi'), 'sushiPref')],
        [Markup.button.callback(ctx.i18n.t('back'), 'pref')]
      ]))
}
)

//Sushi Preference section
bot.action('sushiPref', (ctx) =>
  ctx.reply(ctx.i18n.t('sushiPref.text'),
    Markup.inlineKeyboard(
      [
        [Markup.button.callback(ctx.i18n.t('sushiPref.sushi'), 'toggleCheckbox_sushiPref_sushi')],
        [Markup.button.callback(ctx.i18n.t('sushiPref.bakedsushi'), 'toggleCheckbox_sushiPref_bakedsushi')],
        [Markup.button.callback(ctx.i18n.t('sushiPref.rolls'), 'toggleCheckbox_sushiPref_rolls')],
        [Markup.button.callback(ctx.i18n.t('sushiPref.bakedroll'), 'toggleCheckbox_sushiPref_bakedroll')],
        [Markup.button.callback(ctx.i18n.t('sushiPref.wok'), 'toggleCheckbox_sushiPref_wok')],
        [Markup.button.callback(ctx.i18n.t('sushiPref.sashimi'), 'toggleCheckbox_sushiPref_sashimi')],
        [Markup.button.callback(ctx.i18n.t('sushiPref.soup'), 'toggleCheckbox_sushiPref_soup')],
        [Markup.button.callback(ctx.i18n.t('sushiPref.hot'), 'toggleCheckbox_sushiPref_hot')],
        [Markup.button.callback(ctx.i18n.t('sushiPref.everything'), 'toggleCheckbox_sushiPref_everything')],
        [Markup.button.callback(ctx.i18n.t('accept'), 'sushiPref_apply')],
        [Markup.button.callback(ctx.i18n.t('back'), 'categoryOptions')]
      ])))

bot.action(/sushiPref_apply|asianSoupPref_back/, async (ctx) => {
  await setPreviousStepMultichoices(ctx);
  ctx.reply(ctx.i18n.t('seafoodPref.text'),
    Markup.inlineKeyboard(
      [
        [Markup.button.callback(ctx.i18n.t('seafoodPref.salmon'), 'toggleCheckbox_seafoodPref_salmon')],
        [Markup.button.callback(ctx.i18n.t('seafoodPref.tuna'), 'toggleCheckbox_seafoodPref_tuna')],
        [Markup.button.callback(ctx.i18n.t('seafoodPref.scallop'), 'toggleCheckbox_seafoodPref_scallop')],
        [Markup.button.callback(ctx.i18n.t('seafoodPref.mussels'), 'toggleCheckbox_seafoodPref_mussels')],
        [Markup.button.callback(ctx.i18n.t('seafoodPref.crab'), 'toggleCheckbox_seafoodPref_crab')],
        [Markup.button.callback(ctx.i18n.t('seafoodPref.acne'), 'toggleCheckbox_seafoodPref_acne')],
        [Markup.button.callback(ctx.i18n.t('seafoodPref.crabsticks'), 'toggleCheckbox_seafoodPref_crabsticks')],
        [Markup.button.callback(ctx.i18n.t('seafoodPref.everything'), 'toggleCheckbox_seafoodPref_everything')],
        [Markup.button.callback(ctx.i18n.t('accept'), 'seafoodPref_apply')],
        [Markup.button.callback(ctx.i18n.t('back'), 'sushiPref')]
      ]))
}
)

bot.action(/seafoodPref_apply|wokBasePref_back/, async (ctx) => {
  await setPreviousStepMultichoices(ctx);
  ctx.reply(ctx.i18n.t('asianSoupPref.text'),
    Markup.inlineKeyboard(
      [
        [Markup.button.callback(ctx.i18n.t('asianSoupPref.tomyam'), 'toggleCheckbox_asianSoupPref_tomyam')],
        [Markup.button.callback(ctx.i18n.t('asianSoupPref.miso'), 'toggleCheckbox_asianSoupPref_miso')],
        [Markup.button.callback(ctx.i18n.t('asianSoupPref.ramen'), 'toggleCheckbox_asianSoupPref_ramen')],
        [Markup.button.callback(ctx.i18n.t('asianSoupPref.kimchi'), 'toggleCheckbox_asianSoupPref_kimchi')],
        [Markup.button.callback(ctx.i18n.t('asianSoupPref.fobo'), 'toggleCheckbox_asianSoupPref_fobo')],
        [Markup.button.callback(ctx.i18n.t('asianSoupPref.nothing'), 'toggleCheckbox_asianSoupPref_nothing')],
        [Markup.button.callback(ctx.i18n.t('accept'), 'asianSoupPref_apply')],
        [Markup.button.callback(ctx.i18n.t('back'), 'asianSoupPref_back')]
      ]))
}
)

bot.action(/asianSoupPref_apply|wokFillingPref_back/, async (ctx) => {
  await setPreviousStepMultichoices(ctx);
  ctx.reply(ctx.i18n.t('wokBasePref.text'),
    Markup.inlineKeyboard(
      [
        [Markup.button.callback(ctx.i18n.t('wokBasePref.rice'), 'toggleCheckbox_wokBasePref_rice')],
        [Markup.button.callback(ctx.i18n.t('wokBasePref.udon'), 'toggleCheckbox_wokBasePref_udon')],
        [Markup.button.callback(ctx.i18n.t('wokBasePref.soba'), 'toggleCheckbox_wokBasePref_soba')],
        [Markup.button.callback(ctx.i18n.t('wokBasePref.funchosa'), 'toggleCheckbox_wokBasePref_funchosa')],
        [Markup.button.callback(ctx.i18n.t('wokBasePref.nowok'), 'toggleCheckbox_wokBasePref_nowok')],
        [Markup.button.callback(ctx.i18n.t('wokBasePref.everything'), 'toggleCheckbox_wokBasePref_everything')],
        [Markup.button.callback(ctx.i18n.t('accept'), 'wokBasePref_apply')],
        [Markup.button.callback(ctx.i18n.t('back'), 'wokBasePref_back')]
      ]))
}
)

bot.action('wokBasePref_apply', async (ctx) => {
  await setPreviousStepMultichoices(ctx);
  ctx.reply(ctx.i18n.t('wokFillingPref.text'),
    Markup.inlineKeyboard(
      [
        [Markup.button.callback(ctx.i18n.t('wokFillingPref.beef'), 'toggleCheckbox_wokFillingPref_beef')],
        [Markup.button.callback(ctx.i18n.t('wokFillingPref.chicken'), 'toggleCheckbox_wokFillingPref_chicken')],
        [Markup.button.callback(ctx.i18n.t('wokFillingPref.pork'), 'toggleCheckbox_wokFillingPref_pork')],
        [Markup.button.callback(ctx.i18n.t('wokFillingPref.shrimp'), 'toggleCheckbox_wokFillingPref_shrimp')],
        [Markup.button.callback(ctx.i18n.t('wokFillingPref.mushroom'), 'toggleCheckbox_wokFillingPref_mushroom')],
        [Markup.button.callback(ctx.i18n.t('wokFillingPref.vegetables'), 'toggleCheckbox_wokFillingPref_vegetables')],
        [Markup.button.callback(ctx.i18n.t('wokFillingPref.everything'), 'toggleCheckbox_wokFillingPref_everything')],
        [Markup.button.callback(ctx.i18n.t('accept'), 'wokFillingPref_apply')],
        [Markup.button.callback(ctx.i18n.t('back'), 'wokFillingPref_back')]
      ]))
}
)

bot.action('wokFillingPref_apply', async (ctx) => {
  await setPreviousStepMultichoices(ctx);
  ctx.reply(ctx.i18n.t('brandpref.text'),
    Markup.inlineKeyboard(
      [
        [Markup.button.callback(ctx.i18n.t('brandpref.pizza'), 'pizzaSizePref')],
        [Markup.button.callback(ctx.i18n.t('brandpref.burger'), 'burgerPref')],
        [Markup.button.callback(ctx.i18n.t('brandpref.sushi'), 'sushiPref')],
        [Markup.button.callback(ctx.i18n.t('back'), 'pref')]
      ]))
}
)
bot.launch()

bot.action(/^toggleCheckbox_[A-z]+$/, (ctx) => {
  var messageText = ctx.update.callback_query.message.text;
  var keyboard = ctx.update.callback_query.message.reply_markup.inline_keyboard;

  var newKeyboard = toggleCheckbox(keyboard, ctx.match[0]);

  ctx.editMessageText(messageText, Markup.inlineKeyboard(newKeyboard));
});


function toggleCheckbox(keyboard, key) {
  for (let rowIndex = 0; rowIndex < keyboard.length; rowIndex++) {
    for (let buttonIndex = 0; buttonIndex < keyboard[rowIndex].length; buttonIndex++) {
      let button = keyboard[rowIndex][buttonIndex];
      if (button.callback_data === key) {
        if (button.text.includes('✅')) {
          button.text = button.text.replace('✅', '')
        }
        else {
          button.text += '✅';
        }
        return keyboard;
      }
    }
  }
}

async function setPreviousStepMultichoices(ctx) {
  let data = ctx.update.callback_query.data;
  let options = data.split('_');

  if (options[1] === 'back') {
    return;
  }

  await mongoose.connect(process.env.DB_CONNECTION_STRING);
  let currentUserId = ctx.update.callback_query.from.id;
  let user = await User.findOne({ telegramId: currentUserId });
  let keyboard = ctx.update.callback_query.message.reply_markup.inline_keyboard;
  let finalArray = new Array();
  keyboard.forEach(row => {
    row.forEach(element => {
      if (element.text.includes('✅')) {
        finalArray.push(element.callback_data);
      }
    });
  });
  if (finalArray[0]) {
    let section = finalArray[0].split('_')[1];
    user.set('preferences.' + section, finalArray);
    await user.save();
  }

  await mongoose.disconnect()
}

async function setPreviousChoice(ctx) {
  let data = ctx.update.callback_query.data;
  let options = data.split('_');

  if (options[1] === 'back') {
    return;
  }

  await mongoose.connect(process.env.DB_CONNECTION_STRING);
  let currentUserId = ctx.update.callback_query.from.id;
  let user = await User.findOne({ telegramId: currentUserId });

  let section = options[0];
  user.set('preferences.' + section, [data]);

  await user.save();
  await mongoose.disconnect()
}

function getRegexWithBackButtonExclude(proprtyName, includeBackProperty) {
  let pattern = '(?=(' + proprtyName + '_[A-z]+))(?=(?![A-z]+_back))';
  if (includeBackProperty) {
    pattern += '|(' + includeBackProperty + ')';
  }
  return new RegExp(pattern);
}

//we could choose multiple and single saving e.g. by checking 'apply' presence in the previous key. At some point.  
