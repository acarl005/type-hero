const blessed = require('blessed')
const fs = require('fs')
const chalk = require('chalk')
const path = require('path')
const { highlight } = require('cli-highlight')

// a runtime option for truning on some helpful internal info
const DEBUG = true

// create the one and only screen we'll need
const screen = blessed.screen({
  cursor: {
    artificial: true,
    shape: 'block',
    color: 'green'
  }
})


// these are all the keys that the player pressed
const keyStack = []

// load the code they are gonna type
const code = fs.readFileSync(path.join(__dirname, 'index.js'), 'utf8')

// this box will show the main game window
const box = blessed.box({
  parent: screen,
  // give is the code and highlight the first character green!
  content: chalk.bgGreen(code[0]) + code.slice(1),
  height: DEBUG ? '50%' : '100%',
  scrollable: true,
  border: {
    type: 'line'
  }
})

// use this to display the keystack in DEBUG mode
const debug = blessed.box({
  top: '50%',
  height: '50%-1',
  border: {
    type: 'line'
  }
})

// this will be for arbitrary messages in DEBUG mode
const alert = blessed.box({
  top: '100%-1',
  height: 2
})

// the message for passing to the alert box
let alertMsg = ''

if (DEBUG) {
  screen.append(debug)
  screen.append(alert)
}

// the initial render!
screen.render()

// give us an out
screen.key([ 'C-c' ], () => process.exit(0))

// the handler for all other keypresses
screen.on('keypress', (ch, key) => {

  // add some debug info
  alertMsg = JSON.stringify(key)

  // ctrl+r is for removing the alert message in DEBUG mode
  if (key.ctrl && key.name === 'r') {
    alertMsg = ''
  // on mac, pressing enter triggers TWO keypresses, one called 'enter' and one called 'return'. we only want to respond to one of those. so lets ignore 'return'
  } else if (
    key.name === 'return' ||
    key.ctrl
  ) {
    'ignore'
  } else if (key.name === 'backspace') {
    keyStack.pop()
  // handle all the other typing
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

  // fix the vertical scroll position, so that the screen moves downward as the game advances
  const lineNum = (code.slice(0, keyStack.length).match(/\n/g) || []).length
  // need to subtract the borders, which take up a width of 1 each
  const innerBoxHeight = box.height - 2
  // lets try to keep things centered
  const boxCenter = Math.floor(innerBoxHeight / 2)
  box.scrollTo(lineNum + boxCenter)

  // highlight based on the current state, have they got everything correct up to this point?
  const correct = keyStack.every(keyObj => !keyObj.error)
  let highlighted
  // if so, the "cursor" is green
  if (correct) {
    highlighted = highlight(code.slice(0, keyStack.length), { language: 'javascript' })
      + chalk.bgGreen(wrapNewlines(code[keyStack.length]))
      + code.slice(keyStack.length + 1)
  // if not, the cursor is yellow and all the characters since the first error are red
  } else {
    const errIndex = keyStack.findIndex(keyObj => keyObj.error)
    highlighted = highlight(code.slice(0, errIndex), { language: 'javascript' })
      + chalk.bgRed(code.slice(errIndex, keyStack.length))
      + chalk.bgYellow(wrapNewlines(code[keyStack.length]))
      + code.slice(keyStack.length + 1)
  }

  // update and re-render everything
  box.setContent(highlighted)
  debug.setContent(keyStack.map(obj => obj.key).join(''))
  alert.setContent(String(alertMsg))
  screen.render()
})


// newlines are invlisible. lets give them a little arrow emoji to look at instead
function wrapNewlines(ch) {
  if (ch === '\n') {
    return '↩︎ \n'
  }
  return ch
}

