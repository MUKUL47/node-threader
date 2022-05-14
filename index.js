if (!require("cluster").isMaster) {
  process.on("message", async (data) => {
    process.send({
      response: await eval(data.data),
      invokerId: data.invokerId,
    });
  });
  return;
}

class NodeThreader {
  threads = [];
  listeners = {};
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
    const cpus = require("os").cpus().length;
    this.threads = Array(threads || cpus)
      .fill(true)
      .map(cluster.fork);
    this.initializeListener();
  }

  initializeListener(thread) {
    if (thread) return this.addListener(thread);
    this.threads.forEach(this.addListener);
  }

  addListener = (thread) => {
    this.listeners[thread.id] = ({ invokerId, response }) => {
      this.invokers[thread.id]?.[invokerId]?.(response);
      delete this.invokers[thread.id]?.[invokerId];
      if (Object.keys(this.invokers[thread.id]).length === 0) {
        delete this.invokers[thread.id];
      }
      this.exitProcessOnComplete();
    };
    thread.on("message", this.listeners[thread.id]);
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
   */
  execute(data, callback) {
    const thread = this.threads.slice(0, 1)[0];
    thread.send({
      data: (typeof data === "string" && data) || `${data}`,
      invokerId: this.initializeInvoker(thread, callback),
    });
    this.threads.push(this.threads.splice(0, 1)[0]);
    return thread;
  }

  initializeInvoker(thread, callback) {
    const invokerId = Math.random() * 999999999;
    this.invokers[thread.id] =
      (!this.invokers[thread.id] && {}) || this.invokers[thread.id];
    this.invokers[thread.id][invokerId] = callback;
    return invokerId;
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = NodeThreader;
}
