const NodeThreader = require(".");
//*REQUIRED* this condition check if mandatory because once thread is forked from master this whole block will be executed again to avoid this only allow NodeThreader to initialize only in master node.
if (!require("cluster").isMaster) return;

//thread -> null(consider all threads)
//exitProcess => boolean (exit process once all thread executions are completed)
const instance = new NodeThreader(2, true);

//executable MUST be an ARROW function as it can enclosed in string and retains its property after & before serializing/de-serializing while communicating with clusters.
//thread response supports both callback & promise

instance.execute(
  () => {
    return `Synchronus task : ${2e2 * 2e2}`;
  },
  (error, response) => {
    console.log("callback response ", response);
  }
);

instance
  .execute(
    () => {
      throw "Let me throw error for no reason";
    },
    (error, response) => {
      console.log("callback error ", error);
    }
  )
  .catch((catchResponse) => {
    console.log("Promise rejected ", catchResponse);
  });

instance
  .execute(() => {
    return new Promise(async (r) => {
      await new Promise((r) => setTimeout(r, 1000));
      r("Completed after 1000ms");
    });
  })
  .then((promiseResponse) => {
    console.log("Promise resolved ", promiseResponse);
  });
