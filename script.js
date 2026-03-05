const API_BASE = "http://127.0.0.1:5050";

let selectedTicket = "";
let selectedPrice = 0;

function openInfo(title, html){
  document.getElementById("modalTitle").innerText = title;
  document.getElementById("modalContent").innerHTML = html;
  document.getElementById("infoModal").style.display = "flex";
}
function closeInfo(){
  document.getElementById("infoModal").style.display = "none";
}

function openTiming(){
  openInfo("Таймінг", `
    <p>19:30 — збір гостей</p>
    <p>20:00 — початок шоу</p>
    <p>20:10 — блок 1</p>
    <p>21:50 — перерва</p>
    <p>22:10 — блок 2</p>
    <p>23:45 — завершення</p>
  `);
}

function openRules(){
  openInfo("Правила", `
    <p>• не перебиваємо коміків</p>
    <p>• без повної відеозйомки</p>
    <p>• без спалаху</p>
    <p>• тихий вхід якщо запізнився</p>
  `);
}

function openTickets(){
  openInfo("Квитки", `
    <p>Стандарт — 1500 грн</p>
    <p>Хороші місця — 2000 грн</p>
    <p>VIP — 3000 грн</p>
  `);
}

function openBuy(){
  document.getElementById("buyModal").style.display = "flex";
}
function closeBuy(){
  document.getElementById("buyModal").style.display = "none";
  document.getElementById("ticketSelect").style.display = "block";
  document.getElementById("payment").style.display = "none";
}

function selectTicket(name, price){
  selectedTicket = name;
  selectedPrice = price;
  document.getElementById("ticketSelect").style.display = "none";
  document.getElementById("payment").style.display = "block";
  document.getElementById("ticketInfo").innerText = `${name} — ${price} грн`;
}

function setSiteStatus(status){
  const wrap = document.getElementById("siteStatusWrap");
  const chip = document.getElementById("siteStatusChip");
  const hint = document.getElementById("siteStatusHint");

  wrap.style.display = "block";
  chip.classList.remove("statusPending","statusAccepted","statusRejected");

  if(status === "pending"){
    chip.classList.add("statusPending");
    chip.textContent = "Очікує підтвердження";
    hint.textContent = "Ми перевіряємо квитанцію.";
  } else if(status === "accepted"){
    chip.classList.add("statusAccepted");
    chip.textContent = "Оплата прийнята ✅";
    hint.textContent = "Вашу оплату підтверджено.";
  } else if(status === "rejected"){
    chip.classList.add("statusRejected");
    chip.textContent = "Оплата відхилена ❌";
    hint.textContent = "Спробуйте ще раз або перевірте квитанцію.";
  }
}

async function pollStatus(orderId){
  const timer = setInterval(async () => {
    try{
      const res = await fetch(`${API_BASE}/api/status/${orderId}`);
      const data = await res.json();
      setSiteStatus(data.status);

      if(data.status === "accepted" || data.status === "rejected"){
        clearInterval(timer);
      }
    }catch(e){}
  }, 2500);
}

async function sendReceipt(){
  const name = document.getElementById("name").value.trim();
  const phone = document.getElementById("phone").value.trim().replace(/\D/g, "");
  const file = document.getElementById("receipt").files[0];

  if(!name || !phone || !file || !selectedTicket){
    alert("Заповни всі поля");
    return;
  }

  const fd = new FormData();
  fd.append("ticket", selectedTicket);
  fd.append("price", String(selectedPrice));
  fd.append("name", name);
  fd.append("phone", phone);
  fd.append("receipt", file);

  try{
    const res = await fetch(`${API_BASE}/api/receipt`, {
      method: "POST",
      body: fd
    });

    const data = await res.json();

    if(!data.ok){
      alert("Помилка відправки");
      return;
    }

    setSiteStatus("pending");
    closeBuy();
    pollStatus(data.order_id);
    alert("Квитанцію відправлено");
  }catch(e){
    alert("Сервер недоступний");
  }
}
