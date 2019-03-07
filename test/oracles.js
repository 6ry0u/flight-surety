
const Test = require('../config/testConfig.js')
const truffleAssert = require('truffle-assertions')
//var BigNumber = require('bignumber.js')

contract('Oracles', async (accounts) => {
  const TEST_ORACLES_COUNT = 20
  const STATUS_CODE_UNKNOWN = 0
  const STATUS_CODE_ON_TIME = 10
  const STATUS_CODE_LATE_AIRLINE = 20
  const STATUS_CODE_LATE_WEATHER = 30
  const STATUS_CODE_LATE_TECHNICAL = 40
  const STATUS_CODE_LATE_OTHER = 50
  function statusText (code) {
    let result
    switch (code) {
      case STATUS_CODE_UNKNOWN:
        result = 'unknown'
        break
      case STATUS_CODE_ON_TIME:
        result = 'on time'
        break
      case STATUS_CODE_LATE_AIRLINE:
        result = 'late due to airline'
        break
      case STATUS_CODE_LATE_WEATHER:
        result = 'late due to weather'
        break
      case STATUS_CODE_LATE_TECHNICAL:
        result = 'late due to technical problem'
        break
      case STATUS_CODE_LATE_OTHER:
        result = 'late due to other reason'
        break
    }
    return result
  }

  let config

  before('setup contract', async () => {
    config = await Test.Config(accounts)
  })

  it('can register oracles', async () => {
    // ARRANGE
    let fee = await config.flightSuretyApp.REGISTRATION_FEE.call()

    // ACT
    for (let a = 1; a < TEST_ORACLES_COUNT; a++) {
      const tx = await config.flightSuretyApp.registerOracle({ from: accounts[a], value: fee })
      let result = await config.flightSuretyApp.getMyIndexes.call({ from: accounts[a] })
      // const { event, args: { indexes } } = tx.logs[0]
      truffleAssert.eventEmitted(tx, 'OracleRegistered', ev => {
        console.log(`Oracle registered ${+ev.indexes[0]} ${+ev.indexes[1]} ${+ev.indexes[2]}`)
        return +ev.indexes[0] === +result[0] &
        +ev.indexes[1] === +result[1] &
        +ev.indexes[2] === +result[2]
      })
      // assert.equal(event, 'OracleRegistered', 'OracleRegistered event should have been emitted')
      // assert.equal(+indexes[0], +result[0])
      // assert.equal(+indexes[1], +result[1])
      // assert.equal(+indexes[2], +result[2])
    }
  })

  it('can request flight status', async () => {
    const flight = 'ND1309' // Course number
    const timestamp = Math.floor(Date.now() / 1000)

    // Submit a request for oracles to get status information for a flight
    const tx = await config.flightSuretyApp.fetchFlightStatus(
      config.firstAirline,
      flight,
      timestamp)
    truffleAssert.eventEmitted(
      tx,
      'OracleRequest',
      ev => {
        console.log(`OracleRequest: index ${+ev.index}, airline ${ev.airline}, flight ${ev.flight}, timestamp ${+ev.timestamp}`)
        return ev.flight === flight &
        ev.airline === config.firstAirline &
        +ev.timestamp === timestamp
      },
      'OracleRequest event test: wrong event/event args')

    /* Since the Index assigned to each test account is opaque by design, loop through all the accounts and for each account, all its Indexes (indices?) and submit a response. The contract will reject a submission if it was not requested so while sub-optimal, it's a good test of that feature
    */
    for (let a = 1; a < TEST_ORACLES_COUNT; a++) {
      // Get oracle information
      let oracleIndexes = await config.flightSuretyApp.getMyIndexes.call({ from: accounts[a] })
      for (let idx = 0; idx < 3; idx++) {
        try {
          // Submit a response...it will only be accepted if there is an Index match
          const tx = await config.flightSuretyApp.submitOracleResponse(
            oracleIndexes[idx],
            config.firstAirline,
            flight,
            timestamp,
            STATUS_CODE_ON_TIME,
            { from: accounts[a] })

          // Check OracleReport event, emitted if index match
          truffleAssert.eventEmitted(
            tx,
            'OracleReport',
            ev => {
              console.log(`OracleReport: airline ${ev.airline}, flight ${ev.flight}, timestamp ${+ev.timestamp}, status ${statusText(STATUS_CODE_ON_TIME)}`)
              return ev.airline === config.firstAirline &
              ev.flight === flight &
              +ev.timestamp === timestamp &
              +ev.status === STATUS_CODE_ON_TIME
            },
            'OracleReport event test: wrong event/event args'
          )

          // FlightStatusInfo: emitted when threshold of same responses is reached
          truffleAssert.eventEmitted(
            tx,
            'FlightStatusInfo',
            ev => {
              console.log(`FlightStatusInfo: airline ${ev.airline}, flight ${ev.flight}, timestamp ${+ev.timestamp}, status ${statusText(STATUS_CODE_ON_TIME)}`)
              return ev.airline === config.firstAirline &
              ev.flight === flight &
              +ev.timestamp === timestamp &
              +ev.status === STATUS_CODE_ON_TIME
            },
            'FlightStatusInfo event test: wrong event/event args'
          )
        } catch (e) {
          // Enable this when debugging
          // console.log('\n')
          // console.log('---------------------')
          // console.log(e)
          // console.log('--------------------')
          // console.log('\n')
          // console.log('\nError', idx, oracleIndexes[idx].toNumber(), flight, timestamp)
        }
      }
    }
  })
})
