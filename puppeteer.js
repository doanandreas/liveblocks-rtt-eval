const path = require("path");
const puppeteer = require("puppeteer");

const shortUUID = require("short-uuid");
const generator = shortUUID();

const { TRIAL_NUMBER, PEER_NUMBER } = process.env;

const mysql = require("mysql");
const conn = mysql.createConnection({
  host: "35.188.213.97",
  user: "root",
  password: "root",
  database: "test_data",
});

const getQuery = () => {
  let query;

  switch (PEER_NUMBER) {
    case "2":
      query = "INSERT INTO two_peer (rtt) VALUES ?";
      break;
    case "4":
      query = "INSERT INTO four_peer (rtt) VALUES ?";
      break;
    case "8":
      query = "INSERT INTO eight_peer (rtt) VALUES ?";
      break;
    default:
      break;
  }

  return query;
};

const exportResult = (res) => {
  const query = getQuery();

  conn.query(query, [res], (err) => {
    if (err) throw err;
    conn.end();
  });
};

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "/usr/bin/google-chrome",
    args: ["--no-sandbox"],
  });
  // const browser = await puppeteer.launch({ headless: false });
  // const browser = await puppeteer.launch();
  const page = await browser.newPage();

  page.on("console", (msg) => console.log("LOG:", msg.text()));
  await page.exposeFunction("exportResult", exportResult);

  await page.goto(
    `file://${path.join(__dirname, "test", "dist", "index.html")}`,
    {
      waitUntil: "networkidle0",
    }
  );
  // await page.goto(
  //   "file:///C:/dev-ssd/%23p2p-collab/liveblocks-rtt-eval/test/dist/index.html",
  //   {
  //     waitUntil: "networkidle0",
  //   }
  // );
  await page.evaluate(
    (id, peerNumber, trialNumber, resultExport) =>
      connectToRoom(id, peerNumber, trialNumber, exportResult),
    generator.generate(),
    Number(PEER_NUMBER),
    Number(TRIAL_NUMBER)
  );
})();
