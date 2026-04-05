const https = require("https");

const API_KEY = "AIzaSyDinv2pYkHmKlaDRvConBxG_kt4Vj7Hpig";

const options = {
  hostname: "generativelanguage.googleapis.com",
  path: `/v1beta/models?key=${API_KEY}`,
  method: "GET",
};

const req = https.request(options, (res) => {
  let data = "";
  res.on("data", (chunk) => (data += chunk));
  res.on("end", () => {
    const json = JSON.parse(data);
    json.models.forEach((model) => {
      console.log(`ID: ${model.name} | Nome: ${model.displayName}`);
    });
  });
});

req.on("error", (e) => console.error("Erro:", e.message));
req.end();
