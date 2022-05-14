const NodeThreader = require(".");
if (!require("cluster").isMaster) return;
const instance = new NodeThreader(2, true);
const thread1 = instance.execute(
  `(function () {
    return new Promise((r) => {
      setTimeout(() => r(23123), 1000);
    });
  })()`,
  (data) => {
    console.log(`thread : ${thread1.id}, response = `, data);
  }
);
