import { useState, useEffect, useCallback } from 'react'
import { Button } from './components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs'
import { Badge } from './components/ui/badge'
import { AlertTriangle, Camera, DoorOpen, DoorClosed, Power, Clock, Skull } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import toast, { Toaster } from 'react-hot-toast'

interface Robot {
  id: string
  name: string
  currentCam: number
  isActive: boolean
  moveNight: number
  position: { x: number; y: number }
}

interface GameState {
  currentNight: number
  timeRemaining: number
  powerLevel: number
  leftDoorClosed: boolean
  rightDoorClosed: boolean
  selectedCam: number
  robots: Robot[]
  gameOver: boolean
  victory: boolean
  phase: 'menu' | 'playing' | 'gameover'
  bossActive: boolean
}

const INITIAL_ROBOTS: Robot[] = [
  { id: 'gen', name: 'Gen', currentCam: 4, isActive: false, moveNight: 1, position: { x: 50, y: 50 } },
  { id: 'deddy', name: 'Deddy', currentCam: 4, isActive: false, moveNight: 2, position: { x: 30, y: 60 } },
  { id: 'poppy', name: 'Poppy', currentCam: 4, isActive: false, moveNight: 4, position: { x: 70, y: 40 } }
]

const CAMERA_NAMES = {
  1: 'Living Room',
  2: 'Broken Camera',
  3: 'Party Room',
  4: 'Main Stage'
}

function App() {
  const [gameState, setGameState] = useState<GameState>({
    currentNight: 1,
    timeRemaining: 300, // 5 minutes
    powerLevel: 100,
    leftDoorClosed: false,
    rightDoorClosed: false,
    selectedCam: 1,
    robots: INITIAL_ROBOTS,
    gameOver: false,
    victory: false,
    phase: 'menu',
    bossActive: false
  })

  const [showCameras, setShowCameras] = useState(false)

  const handleGameTick = useCallback(() => {
    setGameState(prev => {
      if (prev.phase !== 'playing') return prev;

      if (prev.timeRemaining <= 0) {
        if (prev.currentNight === 5 && prev.bossActive) {
          return { ...prev, victory: true, phase: 'gameover' }
        }
        toast.success(`Night ${prev.currentNight + 1} begins...`, {
          icon: '🌙',
          duration: 3000,
          style: {
            background: '#1a1a1a',
            color: '#fff'
          }
        })
        return { ...prev, currentNight: prev.currentNight + 1, timeRemaining: 300, powerLevel: 100 }
      }
      return { ...prev, timeRemaining: prev.timeRemaining - 1 }
    })
  }, [])

  
  const handleRobotMovement = useCallback(() => {
    const movedRobotNames: string[] = [];
    setGameState(prev => {
      if (prev.phase !== 'playing') return prev;

      const updatedRobots = prev.robots.map(robot => {
        if (robot.id === 'gen') return robot; // skip Gen
        if (robot.moveNight > prev.currentNight) return robot;

        if (Math.random() < 0.3) {
          const possibleCams = [1, 3, 4];
          const newCam = possibleCams[Math.floor(Math.random() * possibleCams.length)];
          if (newCam !== robot.currentCam) {
            movedRobotNames.push(robot.name);
            return {
              ...robot,
              currentCam: newCam,
              position: { x: Math.random() * 80 + 10, y: Math.random() * 80 + 10 }
            }
          }
        }
        return robot
      })
      return { ...prev, robots: updatedRobots }
    })
    movedRobotNames.forEach(name => {
      toast.error(`${name} is moving!`, {
        icon: '🤖',
        duration: 2000,
        style: { background: '#1a1a1a', color: '#fff', border: '1px solid #dc2626' }
      })
    })
  }, [])

  const handleAttackCheck = useCallback(() => {
    setGameState(prev => {
      if (prev.phase !== 'playing') return prev;

      const robotsAtDoor = prev.robots.filter(robot => 
        robot.currentCam === 1 && robot.moveNight <= prev.currentNight
      )

      let gameOverReason: string | null;

      if (robotsAtDoor.length > 0 && !prev.leftDoorClosed && !prev.rightDoorClosed) {
        gameOverReason = 'YOU DIED!';
      } else if (prev.bossActive && Math.random() < 0.1 && (!prev.leftDoorClosed || !prev.rightDoorClosed)) {
        gameOverReason = 'THE BOSS GOT YOU!';
      }

      if (gameOverReason) {
        toast.error(gameOverReason, {
          icon: '💀',
          duration: 3000,
          style: { background: '#dc2626', color: '#fff', fontSize: '20px' }
        })
        return { ...prev, gameOver: true, phase: 'gameover' }
      }

      return prev
    })
  }, [])

  const [genPhase, setGenPhase] = useState<'idle' | 'to3' | 'to1' | 'toDoor'>('idle');
    const genDoorRef = useRef<'left' | 'right' | null>(null);

  useEffect(() => {
    if (gameState.phase !== 'playing' || gameState.currentNight < 1) return;
    // Find Gen
    const gen = gameState.robots.find(r => r.id === 'gen');
    if (!gen) return;
    let timer: NodeJS.Timeout;
    if (genPhase === 'idle' && gen.currentCam === 4) {
      timer = setTimeout(() => {
        setGameState(prev => ({
          ...prev,
          robots: prev.robots.map(r =>
            r.id === 'gen' ? { ...r, currentCam: 3, position: { x: 60, y: 50 } } : r
          )
        }));
        setGenPhase('to3');
      }, 10000);
    } else if (genPhase === 'to3' && gen.currentCam === 3) {
      timer = setTimeout(() => {
        setGameState(prev => ({
          ...prev,
          robots: prev.robots.map(r =>
            r.id === 'gen' ? { ...r, currentCam: 1, position: { x: 40, y: 60 } } : r
          )
        }));
        setGenPhase('to1');
      }, 8000);
    } else if (genPhase === 'to1' && gen.currentCam === 1) {
      timer = setTimeout(() => {
        // Pick random door
        const door = Math.random() < 0.5 ? 'left' : 'right';
        genDoorRef.current = door;
        setGameState(prev => ({
          ...prev,
          robots: prev.robots.map(r =>
            r.id === 'gen'
              ? { ...r, currentCam: door === 'left' ? 100 : 101, position: { x: door === 'left' ? 10 : 90, y: 50 } }
              : r
          )
        }));
        setGenPhase('toDoor');
        toast.error(`Gen is at the ${door} door!`, {
          icon: '🤖',
          duration: 3000,
          style: { background: '#1a1a1a', color: '#fff', border: '1px solid #dc2626' }
        });
      }, 2000);
    }
    return () => clearTimeout(timer);
  }, [gameState.phase, gameState.currentNight, gameState.robots, genPhase]);

  useEffect(() => {
    if (gameState.phase !== 'playing') return;
    const gen = gameState.robots.find(r => r.id === 'gen');
    if (gen && gen.currentCam === 4 && genPhase !== 'idle') {
      setGenPhase('idle');
    }
  }, [gameState.robots, gameState.phase, genPhase]);

  const toggleDoor = (side: 'left' | 'right') => {
    setGameState(prev => {
      let newRobots = prev.robots;
      // If Gen is at this door, reset him
      const gen = prev.robots.find(r => r.id === 'gen');
      if (gen && ((side === 'left' && gen.currentCam === 100) || (side === 'right' && gen.currentCam === 101))) {
        newRobots = prev.robots.map(r =>
          r.id === 'gen' ? { ...r, currentCam: 4, position: { x: 50, y: 50 } } : r
        );
        setGenPhase('idle');
        toast.success('You blocked Gen! He returned to the stage.', {
          icon: '🔒',
          duration: 2000,
          style: { background: '#1a1a1a', color: '#fff', border: '1px solid #22c55e' }
        });
      }
      return {
        ...prev,
        [side === 'left' ? 'leftDoorClosed' : 'rightDoorClosed']: !prev[side === 'left' ? 'leftDoorClosed' : 'rightDoorClosed'],
        robots: newRobots
      };
    });
  };

  const handlePowerDrain = useCallback(() => {
    setGameState(prev => {
      if (prev.phase !== 'playing') return prev;
      let drain = 1
      if (prev.leftDoorClosed) drain += 2
      if (prev.rightDoorClosed) drain += 2
      if (showCameras) drain += 1

      const newPower = Math.max(0, prev.powerLevel - drain)
      if (newPower === 0) {
        toast.error('POWER OUTAGE!', {
          icon: '💀',
          duration: 3000,
          style: { background: '#dc2626', color: '#fff', fontSize: '20px' }
        })
        return { ...prev, powerLevel: 0, gameOver: true, phase: 'gameover' }
      }
      return { ...prev, powerLevel: newPower }
    })
  }, [showCameras])

  const getRobotsInCam = (camId: number) => {
    return gameState.robots.filter(robot => {
      if (robot.id === 'gen') {
        if (camId === 1 && robot.currentCam === 1) return true;
        if (camId === 3 && robot.currentCam === 3) return true;
        if (camId === 4 && robot.currentCam === 4) return true;
        // camId 100 = left door, 101 = right door
        return false;
      }
      return robot.currentCam === camId && robot.moveNight <= gameState.currentNight;
    });
  };

  // Game timer
  useEffect(() => {
    if (gameState.phase !== 'playing') return
    const timer = setInterval(handleGameTick, 1000)
    return () => clearInterval(timer)
  }, [gameState.phase, handleGameTick])

  // Power drain
  useEffect(() => {
    if (gameState.phase !== 'playing') return
    const powerDrain = setInterval(handlePowerDrain, 2000)
    return () => clearInterval(powerDrain)
  }, [gameState.phase, handlePowerDrain])

  // Robot movement
  useEffect(() => {
    if (gameState.phase !== 'playing') return
    const moveRobots = setInterval(handleRobotMovement, 8000)
    return () => clearInterval(moveRobots)
  }, [gameState.phase, handleRobotMovement])

  // Boss activation on night 5
  useEffect(() => {
    if (gameState.currentNight === 5 && !gameState.bossActive) {
      setGameState(prev => ({ ...prev, bossActive: true }))
      toast.error('THE BOSS IS COMING!', {
        icon: '💀',
        duration: 5000,
        style: { background: '#dc2626', color: '#fff', fontSize: '18px' }
      })
    }
  }, [gameState.currentNight, gameState.bossActive])

  // Check for robot attacks
  useEffect(() => {
    if (gameState.phase !== 'playing') return
    const checkAttacks = setInterval(handleAttackCheck, 3000)
    return () => clearInterval(checkAttacks)
  }, [gameState.phase, handleAttackCheck])

  const startGame = () => {
    setGameState(prev => ({ ...prev, phase: 'playing' }))
    toast.success('Night 1 begins...', {
      icon: '🌙',
      duration: 3000,
      style: {
        background: '#1a1a1a',
        color: '#fff'
      }
    })
  }

  const restartGame = () => {
    setGameState({
      currentNight: 1,
      timeRemaining: 300,
      powerLevel: 100,
      leftDoorClosed: false,
      rightDoorClosed: false,
      selectedCam: 1,
      robots: INITIAL_ROBOTS,
      gameOver: false,
      victory: false,
      phase: 'menu',
      bossActive: false
    })
    setShowCameras(false)
  }

  const getRobotsInCam = (camId: number) => {
    return gameState.robots.filter(robot => {
      if (robot.id === 'gen') {
        if (camId === 1 && robot.currentCam === 1) return true;
        if (camId === 3 && robot.currentCam === 3) return true;
        if (camId === 4 && robot.currentCam === 4) return true;
        // camId 100 = left door, 101 = right door
        return false;
      }
      return robot.currentCam === camId && robot.moveNight <= gameState.currentNight;
    });
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (gameState.phase === 'menu') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
        <Toaster />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full"
        >
          <Card className="bg-gray-900 border-red-900 text-white">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl font-bold text-red-500 mb-2">
                Five Nights at Freddy's
              </CardTitle>
              <CardDescription className="text-gray-300">
                Survive the night by monitoring security cameras and closing doors to protect yourself from the animatronics.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-gray-400 space-y-2">
                <p>• <strong>Gen</strong> moves starting Night 1</p>
                <p>• <strong>Deddy</strong> moves starting Night 2</p>
                <p>• <strong>Poppy</strong> moves starting Night 4</p>
                <p>• <strong>Boss</strong> appears on Night 5</p>
              </div>
              <Button 
                onClick={startGame} 
                className="w-full bg-red-600 hover:bg-red-700 text-white"
                size="lg"
              >
                Start Game
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    )
  }

  if (gameState.phase === 'gameover') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
        <Toaster />
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full"
        >
          <Card className="bg-gray-900 border-red-900 text-white">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl font-bold mb-2">
                {gameState.victory ? (
                  <span className="text-green-500">🎉 VICTORY! 🎉</span>
                ) : (
                  <span className="text-red-500">💀 GAME OVER 💀</span>
                )}
              </CardTitle>
              <CardDescription className="text-gray-300">
                {gameState.victory 
                  ? `Congratulations! You survived all 5 nights!`
                  : `You survived ${gameState.currentNight} night${gameState.currentNight > 1 ? 's' : ''}`
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={restartGame} 
                className="w-full bg-red-600 hover:bg-red-700 text-white"
                size="lg"
              >
                Play Again
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Toaster />
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Badge variant="destructive" className="text-lg px-3 py-1">
              Night {gameState.currentNight}
            </Badge>
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span className="text-xl font-mono">{formatTime(gameState.timeRemaining)}</span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Power className="h-5 w-5" />
            <span className="text-xl font-mono">{gameState.powerLevel}%</span>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Main Security Office */}
        <div className="flex-1 relative bg-gradient-to-br from-gray-800 to-gray-900 p-6">
          <div className="h-full flex flex-col">
            {/* Security Office View */}
            <div className="flex-1 relative">
              <div className="text-center mb-4">
                <h2 className="text-2xl font-bold text-red-500">Security Office</h2>
              </div>
              
              {/* Door Controls */}
              <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                <Button
                  onClick={() => toggleDoor('left')}
                  variant={gameState.leftDoorClosed ? 'destructive' : 'outline'}
                  className="flex flex-col items-center p-4 h-auto"
                >
                  {gameState.leftDoorClosed ? <DoorClosed className="h-8 w-8 mb-2" /> : <DoorOpen className="h-8 w-8 mb-2" />}
                  <span>Left Door</span>
                  <span className="text-xs">{gameState.leftDoorClosed ? 'CLOSED' : 'OPEN'}</span>
                </Button>
              </div>

              <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                <Button
                  onClick={() => toggleDoor('right')}
                  variant={gameState.rightDoorClosed ? 'destructive' : 'outline'}
                  className="flex flex-col items-center p-4 h-auto"
                >
                  {gameState.rightDoorClosed ? <DoorClosed className="h-8 w-8 mb-2" /> : <DoorOpen className="h-8 w-8 mb-2" />}
                  <span>Right Door</span>
                  <span className="text-xs">{gameState.rightDoorClosed ? 'CLOSED' : 'OPEN'}</span>
                </Button>
              </div>

              {/* Boss Warning */}
              <AnimatePresence>
                {gameState.bossActive && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="absolute inset-0 flex items-center justify-center bg-red-900/20 backdrop-blur-sm"
                  >
                    <div className="text-center">
                      <Skull className="h-16 w-16 text-red-500 mx-auto mb-4 animate-pulse" />
                      <h3 className="text-3xl font-bold text-red-500 mb-2">BOSS ACTIVE</h3>
                      <p className="text-lg text-red-300">Keep both doors closed!</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Camera Toggle */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                <Button
                  onClick={() => setShowCameras(!showCameras)}
                  variant={showCameras ? 'destructive' : 'default'}
                  className="flex items-center space-x-2"
                >
                  <Camera className="h-5 w-5" />
                  <span>{showCameras ? 'Close Cameras' : 'Open Cameras'}</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Camera Panel */}
        <AnimatePresence>
          {showCameras && (
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="w-96 bg-gray-800 border-l border-gray-700 overflow-hidden"
            >
              <div className="h-full flex flex-col">
                <div className="p-4 border-b border-gray-700">
                  <h3 className="text-xl font-bold text-green-500">Security Cameras</h3>
                </div>
                
                <div className="flex-1 p-4">
                  <Tabs value={gameState.selectedCam.toString()} onValueChange={(value) => setGameState(prev => ({ ...prev, selectedCam: parseInt(value) }))}>
                    <TabsList className="grid w-full grid-cols-2 mb-4">
                      <TabsTrigger value="1">CAM 1</TabsTrigger>
                      <TabsTrigger value="2" disabled>CAM 2</TabsTrigger>
                    </TabsList>
                    <TabsList className="grid w-full grid-cols-2 mb-4">
                      <TabsTrigger value="3">CAM 3</TabsTrigger>
                      <TabsTrigger value="4">CAM 4</TabsTrigger>
                    </TabsList>

                    <TabsContent value="1" className="space-y-4">
                      <Card className="bg-gray-900 border-gray-600">
                        <CardHeader>
                          <CardTitle className="text-green-500">CAM 1 - {CAMERA_NAMES[1]}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="relative h-32 bg-gray-800 rounded border-2 border-gray-600">
                            {getRobotsInCam(1).map((robot) => (
                              <motion.div
                                key={robot.id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="absolute text-red-500 font-bold text-sm"
                                style={{
                                  left: `${robot.position.x}%`,
                                  top: `${robot.position.y}%`,
                                  transform: 'translate(-50%, -50%)'
                                }}
                              >
                                {robot.name}
                              </motion.div>
                            ))}
                            {getRobotsInCam(1).length === 0 && (
                              <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                                Empty
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="2">
                      <Card className="bg-gray-900 border-gray-600">
                        <CardHeader>
                          <CardTitle className="text-red-500">CAM 2 - {CAMERA_NAMES[2]}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="relative h-32 bg-gray-800 rounded border-2 border-red-600">
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="text-center">
                                <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                                <span className="text-red-500 font-bold">CAMERA OFFLINE</span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="3">
                      <Card className="bg-gray-900 border-gray-600">
                        <CardHeader>
                          <CardTitle className="text-green-500">CAM 3 - {CAMERA_NAMES[3]}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="relative h-32 bg-gray-800 rounded border-2 border-gray-600">
                            {getRobotsInCam(3).map((robot) => (
                              <motion.div
                                key={robot.id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="absolute text-red-500 font-bold text-sm"
                                style={{
                                  left: `${robot.position.x}%`,
                                  top: `${robot.position.y}%`,
                                  transform: 'translate(-50%, -50%)'
                                }}
                              >
                                {robot.name}
                              </motion.div>
                            ))}
                            {getRobotsInCam(3).length === 0 && (
                              <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                                Empty
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="4">
                      <Card className="bg-gray-900 border-gray-600">
                        <CardHeader>
                          <CardTitle className="text-green-500">CAM 4 - {CAMERA_NAMES[4]}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="relative h-32 bg-gray-800 rounded border-2 border-gray-600">
                            {getRobotsInCam(4).map((robot) => (
                              <motion.div
                                key={robot.id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="absolute text-blue-400 font-bold text-sm"
                                style={{
                                  left: `${robot.position.x}%`,
                                  top: `${robot.position.y}%`,
                                  transform: 'translate(-50%, -50%)'
                                }}
                              >
                                {robot.name}
                              </motion.div>
                            ))}
                            {getRobotsInCam(4).length === 0 && (
                              <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                                Empty Stage
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default App