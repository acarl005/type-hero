const blessed = require('blessed')
const fs = require('fs')
const chalk = require('chalk')
const path = require('path')
const { highlight } = require('cli-highlight')

// a runtime option for truning on some helpful internal info
const DEBUG = false

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

// pick a random javascript file in there
const srcDir = path.join(__dirname, 'code', 'javascript', 'jquery')
const files = fs.readdirSync(srcDir)
const file = path.join(srcDir, files[Math.floor(Math.random() * files.length)])

// and read in the source code
const code = fs.readFileSync(file, 'utf8')

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

// State for the current session
let state = {
  startTime: null,
  numBackspaces: 0,
  errors: []
}

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
  // save time of key press
  let now = Date.now()

  if (!state.startTime) {
    state.startTime = now
  }

  // add some debug info
  alertMsg = JSON.stringify(key) + JSON.stringify(ch)

  // default to the key press is correct
  let isCorrect = true
  // ctrl+r is for removing the alert message in DEBUG mode
  if (key.ctrl && key.name === 'r') {
    alertMsg = ''
  // on mac, pressing enter triggers TWO keypresses, one called 'enter' and one called 'return'.
  // we only want to respond to one of those. so lets ignore 'return'
  } else if (
    key.name === 'return' ||
    key.ctrl
  ) {
    'ignore'
    return
  } else if (key.name === 'backspace') {
    state.numBackspaces++
    keyStack.pop()
  // handle all the other typing
  } else {
    const keyObj = {
      key: ch
    }
    if (key.name === 'enter') {
      keyObj.key = '\n'
      isCorrect = code[keyStack.length] === '\n'
      while (code[keyStack.length + 1].match(/\s/)) {
        keyStack.push({
          key: code[keyStack.length + 1],
          error: false
        })
      }
    } else {
      isCorrect = code[keyStack.length] === ch
    }
    keyStack.push(keyObj)
    keyObj.error = !isCorrect
  }

  // highlight based on the current state, have they got everything correct up to this point?
  let highlighted
  let errors = state.errors
  let wasCorrect = state.correct
  // fix the vertical scroll position, so that the screen moves downward as the game advances
  const lineNum = (code.slice(0, keyStack.length).match(/\n/g) || []).length
  // need to subtract the borders, which take up a width of 1 each
  const innerBoxHeight = box.height - 2
  // lets try to keep things centered
  const boxCenter = Math.floor(innerBoxHeight / 2)
  box.scrollTo(lineNum + boxCenter)

  // check for incorrect key press
  state.correct = keyStack.every(keyObj => !keyObj.error)
  if (state.correct) {
    if (!wasCorrect && errors.length > 0) {
      errors[errors.length - 1].end = now
    }
    if (code.length === keyStack.length && wasCorrect) {
      state.endTime = now
      const minutes = (state.endTime - state.startTime) / 1000 / 60
      // User has finished the test, what to do?
      const results = blessed.box({
        parent: screen,
        top: '25%',
        left: '25%',
        height: '50%',
        width: '50%',
        content: `
Done!
${keyStack.length / minutes / 5} WPM
        `,
        border: {
          type: 'line'
        }
      })
      return screen.render()
    }
    // if so, the "cursor" is green
    highlighted = highlight(code.slice(0, keyStack.length), { language: 'javascript' })
      + chalk.bgGreen(wrapNewlines(code[keyStack.length]))
      + code.slice(keyStack.length + 1)
  } else {
    // check if already in error state
    if (wasCorrect) {
      errors.push({
        count: 0,
        start: now
      })
    } else if (key.name !== 'backspace' && errors.length > 0) {
      errors[errors.length - 1].count++
    }
    // if not, the cursor is yellow and all the characters since the first error are red
    const errIndex = keyStack.findIndex(keyObj => keyObj.error)
    highlighted = highlight(code.slice(0, errIndex), { language: 'javascript' })
      + chalk.bgRed(code.slice(errIndex, keyStack.length))
      + chalk.bgYellow(wrapNewlines(code[keyStack.length]))
      + code.slice(keyStack.length + 1)
  }

  // update and re-render everything
  box.setContent(highlighted)
  debug.setContent(keyStack.map(obj => obj.key).join(''))
  alert.setContent(String(alertMsg) + JSON.stringify(state))
  screen.render()
})


// newlines are invlisible. lets give them a little arrow emoji to look at instead
function wrapNewlines(ch) {
  if (ch === '\n') {
    return '↩︎ \n'
  }
  return ch
}

