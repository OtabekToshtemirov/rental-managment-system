export const ansiColors = {
  black(string) {
    return `\x1b[30;1m${string}\x1b[0m`
  },
  red(string) {
    return `\x1b[31;1m${string}\x1b[0m`
  },
  green(string) {
    return `\x1b[32;1m${string}\x1b[0m`
  },
  yellow(string) {
    return `\x1b[33;1m${string}\x1b[0m`
  },
  blue(string) {
    return `\x1b[34;1m${string}\x1b[0m`
  },
  magenta(string) {
    return `\x1b[35;1m${string}\x1b[0m`
  },
  cyan(string) {
    return `\x1b[36;1m${string}\x1b[0m`
  },
  white(string) {
    return `\x1b[37;1m${string}\x1b[0m`
  },
  bgred(string) {
    return `\x1b[41m${string}\x1b[0m`
  },
}
