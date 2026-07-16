/**
 * HeartbeatManager Module.
 * Heartbeat is a server call executed every few seconds when game is inactive. While user is doing spin, it means the game is active, no heartbeat is needed, but if user wait a time without do spin, heartbeat should be called. This inactivity time is customized and it's defined in a variable of your config file.
 * This module control heartbeat behavior, initialize the process, receive the spin alert when spin is executed and store the callback function to be executed when heartbeat is done
 * How to use:
 * Include this library in your slot game.
 *
 * Define a config variable named TimeHeartBeatCall. It is a time in miliseconds that indicates how often heartbeat should run if game is idle.
 *
 * Define a function in your code with the name you want, to be executed when heartbeat server call is done. That function updates the game balance on screen using the CustomerBalance variable returned by server if you use web-connector-class-v2 or Global.Connector.bal if you use ms-sever-connector file.Example:
 * function updateGameAfterHeartbeat(){
 *   drawBalance(CustomerBalance);
 * }
 *
 * Init the heartbeat calling function initHeartbeat. You need two parameters, the game session and the function you create previously in your code to be executed after heartbeat for updating balance. When start heartbeat process, this module checks constantly if game has receive some spin in last seconds or has been inactive. When is idle for the time that you configured, the library does the heartbeat call to server.  Example:
 * HeartbeatManager.initHeartbeat(GlobalGameSession, updateGameAfterHeartbeat);
 *
 * Make sure in your code, when heartbeat response is processed, the function updateGameFunct is called. It is important because is the function you create to update balance on screen. Example:
 * HeartbeatManager.updateGameFunct();
 *
 *
 *  @module  HeartbeatManager
 */
var HeartbeatManager = (function () {
  return {
    LastServerCall: null,
    SpinExecuted: false,
    newInterval: null,

    /**
     * @description Stores the function you create to update balance after heartbeat is completed. It starts empty but is going to be assigned on initHeartbeat function later
     * @function updateGameFunct
     */
    updateGameFunct: function () {},

    /**
     * @description Init heartbeat to run every few seconds if spin is not executed in that time
     * @function initHeartbeat
     * @param {string} gameSession session needed to call the heartbeat
     * @param {function} callback function name to be called after read heartbeat response, this function is needed to update balance, it is assigned to updateGameFunct
     */
    initHeartbeat: function (gameSessionInput, callback) {
      this.updateGameFunct = callback
      var gameS = gameSessionInput
      var newDate = null
      var dif = null
      var that = this
      this.LastServerCall = new Date()
      newInterval = setInterval(function () {
        newDate = new Date()
        dif = newDate - that.LastServerCall

          //console.log(" difference ", dif, " typeof ", typeof(dif), " heatbeattime " +TimeHeartBeatCall + " gameS ", gameS);
        if (dif >= TimeHeartBeatCall) {
          that.LastServerCall = new Date()
          if (gameS != null) {
            if (typeof (HeartBeat) !== 'undefined') {
              HeartBeat.GameSession = gameS
              HeartBeat.doHeartBeat()
            } else {
                // Global.Connector.rootLevel = '../../../'
              Global.Connector.gameSession = gameSessionInput
              ServerManager.doHeartBeatAction()
            }
          }
        }
      }, 1000)
    },

    /**
     * @description Set the time where was called last spin
     * @function setSpinExecuted
     */
    setLastServerCall: function () {
      this.LastServerCall = new Date()
    },

    killHeartbeat: function () {
      clearInterval(newInterval);
      newInterval = null;
    }
  }
})()
