# A simple multi-thread library for nodejs run time.</a>

### install package

```
npm i node-threader
```

### usage

```javascript
const NodeThreader = require("node-threader");
//BELOW LINE IS REQUIRED SINCE WHOLE NODE PROCESS INCLUDES BOTH MASTER & WORKER THREADS
if (!require("cluster").isMaster) return;
const instance = new NodeThreader(2, true);

//function must be enclosed in IFFE & enclosed in string

const myThread = instance.execute(
  `(function () {
    return new Promise((r) => {
      setTimeout(() => r('Hello'), 1000);
    });
  })()`,
  (data) => {
    //callback from thread
    console.log(`thread : ${myThread.id}, response = `, data);
  }
);

//synchronous execution
instance.execute(
  `(function(){
      for(let i = 0; i < 1000000;i++){}
      return 'Useless loop ran in worker thread'
  }())`,console.log
);
```
