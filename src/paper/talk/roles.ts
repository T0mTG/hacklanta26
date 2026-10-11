// Which of the four voices a character has: a male animal, a female animal, a mom or a dad.
//
//  1. Its name decides first: "Mom", "Grandma" -> mom; "Dad", "Grandpa" -> dad; "girl", "queen", "hen" -> female; "boy", "king", "rooster" -> male.
//  2. Otherwise the kind: some kinds are drawn masculine or feminine in kids' stories (a lion, a rooster; a butterfly, a cat).
//  3. Otherwise it is fixed by the character's id, so one character always keeps one voice and the planet has a mix.
//  A person with nothing to go on is a grown-up: mom or dad.
export type Role = 'male' | 'female' | 'mom' | 'dad'

const MOM = /\b(mom|mommy|mum|mummy|mama|mother|grandma|granny|nana|grandmother|aunt|auntie)\b/
const DAD = /\b(dad|daddy|papa|father|grandpa|grandad|grandfather|uncle)\b/
const FEMALE = /\b(girl|woman|lady|queen|princess|she|her|hen|mare|cow|ewe|doe|sister|daughter|fairy|witch|mermaid)\b/
const MALE = /\b(boy|man|king|prince|he|him|rooster|stallion|bull|ram|buck|brother|son|knight|wizard)\b/

const MASCULINE = new Set(['lion', 'bear', 'rooster', 'peacock', 'horse', 'elephant', 'rhino', 'fox', 'dog', 'monkey', 'kangaroo', 'pig', 'goat', 'ship', 'boat', 'car'])
const FEMININE = new Set(['cat', 'butterfly', 'rabbit', 'sheep', 'deer', 'chick', 'swan', 'unicorn', 'cow', 'bee', 'panda', 'giraffe', 'jellyfish', 'duck', 'mouse', 'squirrel'])

export function roleFor(kind: string, name: string, uid: string): Role {
  const n = name.toLowerCase()
  if (MOM.test(n)) return 'mom'
  if (DAD.test(n)) return 'dad'
  const person = kind === 'person'
  if (FEMALE.test(n)) return person ? 'mom' : 'female'
  if (MALE.test(n)) return person ? 'dad' : 'male'
  if (MASCULINE.has(kind)) return 'male'
  if (FEMININE.has(kind)) return 'female'
  let h = 0
  for (const ch of uid) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  if (person) return h % 2 ? 'mom' : 'dad'
  return h % 2 ? 'female' : 'male'
}
