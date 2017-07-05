const blessed = require('blessed')
const fs = require('fs')
const chalk = require('chalk')
const path = require('path')
const { highlight } = require('cli-highlight')

const DEBUG = false

const screen = blessed.screen({
  cursor: {
    artificial: true,
    shape: 'block',
    color: 'green'
  }
})

const keyStack = []
const code = fs.readFileSync(path.join(__dirname, 'index.js'), 'utf8')

const box = blessed.box({
  content: chalk.bgGreen(code[0]) + code.slice(1),
  height: DEBUG ? '50%' : '100%',
  scrollable: true,
  border: {
    type: 'line'
  }
})

const debug = blessed.box({
  top: '50%',
  height: '50%-2',
  border: {
    type: 'line'
  }
})

const alert = blessed.box({
  top: '100%-2',
  height: 2
})

let alertMsg = ''

screen.append(box)
if (DEBUG) {
  screen.append(debug)
  screen.append(alert)
}

screen.render()
screen.key([ 'C-c' ], () => process.exit(0))
screen.on('keypress', (ch, key) => {

  // add some debug info
  alertMsg += JSON.stringify(key)

  // handle the keypress
  if (key.ctrl && key.name === 'r') {
    alertMsg = ''
  } else if (
    key.name === 'return' ||
    key.ctrl
  ) {
    'ignore'
  } else if (key.name === 'backspace') {
    keyStack.pop()
  } else {
    const keyObj = {
      key: ch,
    }
    if (key.name === 'enter') {
      keyObj.key = '\n'
    }
    keyObj.error = code[keyStack.length] !== keyObj.key
    keyStack.push(keyObj)
  }

  // fix the scroll position
  const lineNum = (code.slice(0, keyStack.length).match(/\n/g) || []).length
  const innerBoxHeight = box.height - 2 // need to subtract the borders
  const boxCenter = Math.floor(innerBoxHeight / 2)
  box.scrollTo(lineNum + boxCenter)

  // highlight based on the current state
  const correct = keyStack.every(keyObj => !keyObj.error)
  let highlighted
  if (correct) {
    highlighted = highlight(code.slice(0, keyStack.length), { language: 'javascript' })
      + chalk.bgGreen(wrapNewlines(code[keyStack.length]))
      + code.slice(keyStack.length + 1)
  } else {
    const errIndex = keyStack.findIndex(keyObj => keyObj.error)
    highlighted = highlight(code.slice(0, errIndex), { language: 'javascript' })
      + chalk.bgRed(code.slice(errIndex, keyStack.length))
      + chalk.bgYellow(wrapNewlines(code[keyStack.length]))
      + code.slice(keyStack.length + 1)
  }

  // update and render
  box.setContent(highlighted)
  debug.setContent(keyStack.map(obj => obj.key).join(''))
  alert.setContent(String(alertMsg))
  screen.render()
})

function wrapNewlines(ch) {
  if (ch === '\n') {
    return '↩︎ \n'
  }
  return ch
}

