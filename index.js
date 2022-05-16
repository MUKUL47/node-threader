if (!require("cluster").isMaster) {
  process.on("message", async (data) => {
    let isError = false;
    const response = await (async () => {
      try {
        return await eval(data.data)();
      } catch (e) {
        isError = true;
        return e;
      }
    })();
    process.send({
      response,
      invokerId: data.invokerId,
      isError,
    });
  });
  return;
}

class NodeThreader {
  threads = [];
  invokers = {};
  exitProcess = false;
  /**
   * @param {number|null} threads
   * @param {boolean} exitProcess
   */
  constructor(threads, exitProcess = false) {
    this.initializeThreads(threads);
    this.exitProcess = exitProcess;
  }

  initializeThreads(threads = 1) {
    const cluster = require("cluster");
    this.threads = Array(threads || require("os").cpus().length)
      .fill(true)
      .map(cluster.fork);
    this.initializeListener();
  }

  initializeListener(thread) {
    if (thread) return this.addListener(thread);
    this.threads.forEach(this.addListener);
  }

  addListener = (thread) => {
    thread.on("message", async ({ invokerId, response, isError }) => {
      const currentInvokers = this.invokers[thread.id]?.[invokerId];
      currentInvokers?.callback?.(
        (isError && response) || null,
        (!isError && response) || null
      );
      currentInvokers?.[(isError && "reject") || "resolve"]?.(response);
      setTimeout(() => {
        delete this.invokers[thread.id]?.[invokerId];
        if (Object.keys(this.invokers[thread.id]).length === 0) {
          delete this.invokers[thread.id];
        }
        this.exitProcessOnComplete();
      });
    });
    thread.on("exit", () => this.onThreadExit(thread));
  };

  exitProcessOnComplete() {
    if (!this.exitProcess) return;
    if (Object.keys(this.invokers).length === 0) {
      process.exit();
    }
  }

  onThreadExit(thread) {
    Object.values(this.invokers[thread.id] || {}).forEach((func) =>
      func(new Error("Process died"))
    );
    const newThread = require("cluster").fork();
    this.threads = [newThread, ...this.threads];
    this.initializeListener(newThread);
  }

  /**
   * @param {function} data
   * @param {string} data
   * @param {function} callback
   * @returns Promise
   */
  execute(data, callback) {
    const thread = this.threads.slice(0, 1)[0];
    const invokerId = this.initializeInvoker(thread, callback);
    thread.send({
      data: (typeof data === "string" && data) || `${data}`,
      invokerId,
    });
    this.threads.push(this.threads.splice(0, 1)[0]);
    const invoker = this.invokers[thread.id][invokerId];
    invoker["callback"] = callback;
    return new Promise((resolve, reject) => {
      invoker["resolve"] = resolve;
      invoker["reject"] = reject;
    });
  }

  initializeInvoker(thread) {
    const invokerId = Math.random() * 999999999;
    this.invokers[thread.id] =
      (!this.invokers[thread.id] && {}) || this.invokers[thread.id];
    this.invokers[thread.id][invokerId] = {
      ...(this.invokers[thread.id][invokerId] || {}),
    };
    return invokerId;
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = NodeThreader;
}
