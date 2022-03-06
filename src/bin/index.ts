async function main() {
  console.log("Hello world.");
}

if (require.main === module) {
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  main().then(() => process.exit(0));
}
