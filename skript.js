const BOT_TOKEN = "8643172698:AAHhLAYr8n1MTHelM7SzXP1TwM1d4uJgeoo"
const CHAT_ID = "966735372"

let selectedTicket = ""
let selectedPrice = ""

function openInfo(title,text){

document.getElementById("modalTitle").innerText = title
document.getElementById("modalContent").innerHTML = text

document.getElementById("infoModal").style.display = "flex"

}

function closeInfo(){
document.getElementById("infoModal").style.display = "none"
}


/* ТАЙМІНГ */

function openTiming(){

openInfo("Таймінг",

`
<p>19:30 — збір гостей</p>
<p>20:00 — початок шоу</p>
<p>20:10 — блок 1</p>
<p>21:50 — перерва</p>
<p>22:10 — блок 2</p>
<p>23:45 — завершення</p>
`
)

}


/* ПРАВИЛА */

function openRules(){

openInfo("Правила",

`
<p>• не перебиваємо коміків</p>
<p>• без відеозйомки</p>
<p>• без спалаху</p>
<p>• тихий вхід якщо запізнився</p>
`
)

}


/* КВИТКИ */

function openTickets(){

openInfo("Квитки",

`
<p>Стандарт — 1500 грн</p>
<p>Хороші місця — 2000 грн</p>
<p>VIP — 3000 грн</p>
`
)

}


/* ПОКУПКА */

function openBuy(){

document.getElementById("buyModal").style.display = "flex"

}

function closeBuy(){

document.getElementById("buyModal").style.display = "none"

document.getElementById("ticketSelect").style.display = "block"

document.getElementById("payment").style.display = "none"

}


/* ВЫБОР БИЛЕТА */

function selectTicket(name,price){

selectedTicket = name
selectedPrice = price

document.getElementById("ticketSelect").style.display = "none"
document.getElementById("payment").style.display = "block"

document.getElementById("ticketInfo").innerHTML = name + " — " + price + " грн"

}


/* ОТПРАВКА В TELEGRAM */

async function sendReceipt(){

let name = document.getElementById("name").value
let phone = document.getElementById("phone").value
let file = document.getElementById("receipt").files[0]

if(!name || !phone || !file){
alert("Заповни всі поля")
return
}

let text =
`🎟 НОВИЙ КВИТОК

Квиток: ${selectedTicket}
Ціна: ${selectedPrice} грн

Ім'я: ${name}
Телефон: +380${phone}`


/* отправка фото */

let formData = new FormData()

formData.append("chat_id", CHAT_ID)
formData.append("caption", text)
formData.append("photo", file)

await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`,{
method:"POST",
body:formData
})

alert("Квитанція відправлена")

}