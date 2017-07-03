const blessed = require('blessed')
const fs = require('fs')
const chalk = require('chalk')
const path = require('path')
const { highlight } = require('cli-highlight')

const screen = blessed.screen({
  debug: true,
  cursor: {
    artificial: true,
    shape: 'block',
    color: 'green'
  }
})

const keyStack = []
const code = fs.readFileSync(path.join(__dirname, 'index.js'), 'utf8')

const box = blessed.box({
  content: code
})

screen.append(box)

screen.render()
screen.key([ 'C-c' ], () => process.exit(0))
screen.key([ 'C-b' ], () => screen.debug(keyStack, code))
screen.on('keypress', (ch, key) => {
  if (key.name === 'backspace') {
    keyStack.pop()
  } else {
    keyStack.push(ch)
  }
  const highlighted = highlight(code.slice(0, keyStack.length), { language: 'javascript' })
    + chalk.bgGreen(wrap(code[keyStack.length]))
    + code.slice(keyStack.length + 1)
  box.setContent(highlighted)
  screen.render()
})

function wrap(ch) {
  if (ch === '\n') {
    return '↩︎ \n'
  }
  return ch
}

