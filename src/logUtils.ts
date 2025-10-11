export function log(msg: string, ...args: any[]) {
  if (args.length > 0) {
    console.log(msg, ...args);
  } else {
    console.log(msg);
  }
}
