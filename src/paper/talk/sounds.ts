// Animals do not talk, they make their noise. A kind with an entry here answers with one of its sounds (no AI needed);
// everything else (people, trees, houses, things) is answered by Gemini in words.
const SOUNDS: Record<string, string[]> = {
  cat: ['Meow!', 'Meow meow!', 'Mrrrow...', 'Purrrr purrr'],
  dog: ['Woof woof!', 'Arf arf!', 'Woof!', 'Ruff ruff!'],
  sheep: ['Baaa!', 'Baa baaa!', 'Baaaah...'],
  cow: ['Moooo!', 'Mooo moooo!', 'Moo...'],
  pig: ['Oink oink!', 'Oink!', 'Snort snort oink!'],
  goat: ['Meeeh!', 'Maaa maaa!', 'Meh heh heh!'],
  horse: ['Neigh!', 'Neeeigh!', 'Hee hee neigh!'],
  fox: ['Yip yip!', 'Ring-ding-ding!', 'Wa-pa-pa-pow!'],
  deer: ['Hoo hoo!', 'Snort!', 'Eeep!'],
  zebra: ['Hee-haw!', 'Neigh neigh!', 'Whinny!'],
  elephant: ['Toooot!', 'Prrrooot!', 'Toot toooot!'],
  giraffe: ['Hmmm hmmm!', 'Mmmmm!', 'Hum hum!'],
  rhino: ['Snort snort!', 'Hrrrnk!', 'Grunt grunt!'],
  lion: ['ROAR!', 'Rawr!', 'Grrr rawr!'],
  leopard: ['Grrrr!', 'Rawr!', 'Purr rawr!'],
  camel: ['Grrrh!', 'Bleeeh!', 'Hrrr hrrr!'],
  rabbit: ['Squeak!', 'Thump thump!', 'Sniff sniff!'],
  hedgehog: ['Snuffle snuffle!', 'Hiss!', 'Pfft pfft!'],
  squirrel: ['Chit chit!', 'Chatter chatter!', 'Squeek!'],
  snail: ['Slooow... hi...', 'Squelch squelch!', 'Slurp...'],
  caterpillar: ['Munch munch!', 'Crunch crunch!', 'Nom nom nom!'],
  frog: ['Ribbit ribbit!', 'Croak!', 'Ribbit!'],
  chameleon: ['Tsss tsss!', 'Hiss!', 'Click click!'],
  unicorn: ['Neeigh! Sparkle!', 'Hee hee neigh!', 'Neigh neigh!'],
  bear: ['Grrr!', 'Growl!', 'Rawr! Hug!'],
  monkey: ['Ooh ooh ah ah!', 'Ooh ah!', 'Eee eee!'],
  panda: ['Mmm munch munch!', 'Huff huff!', 'Bleat!'],
  kangaroo: ['Boing boing!', 'Chuh chuh!', 'Grunt!'],
  mouse: ['Squeak squeak!', 'Eek!', 'Squeeek!'],
  rooster: ['Cock-a-doodle-doo!', 'Cluck cluck!', 'Bok bok!'],
  chick: ['Peep peep!', 'Cheep cheep!', 'Peep!'],
  peacock: ['Pee-ow! Pee-ow!', 'Kee-ow!', 'Hoot hoot!'],
  stork: ['Clack clack!', 'Clatter clatter!', 'Clap clap clap!'],
  bird: ['Tweet tweet!', 'Chirp chirp!', 'Tweeeet!'],
  butterfly: ['Flap flap!', 'Flutter flutter!', 'Fwip fwip!'],
  bee: ['Bzzzzz!', 'Buzz buzz!', 'Bzzz bzzz!'],
  fish: ['Glub glub!', 'Blub blub!', 'Glob glob!'],
  dolphin: ['Eee eee eee!', 'Click click eee!', 'Ee ee ee!'],
  whale: ['Wooooooo!', 'Woooo ooooo!', 'Whooooo...'],
  jellyfish: ['Bloop bloop!', 'Wibble wobble!', 'Blub blub!'],
  duck: ['Quack quack!', 'Quack!', 'Quack quack quack!'],
  swan: ['Honk honk!', 'Hisss!', 'Honk!'],
  starfish: ['Shhhh...', 'Blip blip!', 'Tap tap!'],
  car: ['Beep beep!', 'Vroom vroom!', 'Honk honk!'],
  boat: ['Toot toot!', 'Splish splash!', 'Hoooonk!'],
  ship: ['Toooot!', 'Toot toot!', 'Splash splash!'],
}

// one of the kind's sounds, not the one it said last time
let last = ''
export function soundFor(kind: string): string | null {
  const all = SOUNDS[kind]
  if (!all) return null
  const pick = all.filter((s) => s !== last)
  last = pick[Math.floor(Math.random() * pick.length)]
  return last
}
export const makesSounds = (kind: string) => kind in SOUNDS

// the few words an animal says after its noise when there is no AI to think of some
const WORDS = ['Hi friend!', 'Hello!', 'Come play!', 'I am happy!', 'Yay!', 'Wanna play?', 'I like you!']
export const someWords = () => WORDS[Math.floor(Math.random() * WORDS.length)]
