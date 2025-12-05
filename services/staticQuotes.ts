
import { Quote } from "../types";

export const STOIC_QUOTES: Quote[] = [
  { text: "No man is free who is not master of himself.", author: "Epictetus" },
  { text: "You have power over your mind - not outside events. Realize this, and you will find strength.", author: "Marcus Aurelius" },
  { text: "It is not that we have a short time to live, but that we waste a lot of it.", author: "Seneca" },
  { text: "The best revenge is not to be like your enemy.", author: "Marcus Aurelius" },
  { text: "Waste no more time arguing about what a good man should be. Be one.", author: "Marcus Aurelius" },
  { text: "He who fears death will never do anything worthy of a man who is alive.", author: "Seneca" },
  { text: "Difficulties strengthen the mind, as labor does the body.", author: "Seneca" },
  { text: "Man conquers the world by conquering himself.", author: "Zeno of Citium" },
  { text: "We suffer more often in imagination than in reality.", author: "Seneca" },
  { text: "If you want to be a writer, write.", author: "Epictetus" },
  { text: "To be calm is the highest achievement of the self.", author: "Zen Proverb" },
  { text: "Wealth consists not in having great possessions, but in having few wants.", author: "Epictetus" },
  { text: "Don't explain your philosophy. Embodiy it.", author: "Epictetus" },
  { text: "The soul becomes dyed with the color of its thoughts.", author: "Marcus Aurelius" },
  { text: "Luck is what happens when preparation meets opportunity.", author: "Seneca" },
  { text: "Confine yourself to the present.", author: "Marcus Aurelius" },
  { text: "Focus on what you can control, ignore the rest.", author: "Epictetus" },
  { text: "A gem cannot be polished without friction, nor a man perfected without trials.", author: "Seneca" },
  { text: "Do not waste what remains of your life in speculating about your neighbors.", author: "Marcus Aurelius" },
  { text: "First say to yourself what you would be; and then do what you have to do.", author: "Epictetus" },
  { text: "It is the quality of our work which will please God and not the quantity.", author: "Mahatma Gandhi" }, 
  { text: "Concentrate every minute like a Roman—like a man—on doing what's in front of you with precise and genuine seriousness.", author: "Marcus Aurelius" },
  { text: "Think of yourself as dead. You have lived your life. Now take what's left and live it properly.", author: "Marcus Aurelius" },
  { text: "Because a thing seems difficult for you, do not think it impossible for anyone to accomplish.", author: "Marcus Aurelius" },
  { text: "Dwell on the beauty of life. Watch the stars, and see yourself running with them.", author: "Marcus Aurelius" },
  
  // New Additions
  { text: "The happiness of your life depends upon the quality of your thoughts.", author: "Marcus Aurelius" },
  { text: "If it is not right do not do it; if it is not true do not say it.", author: "Marcus Aurelius" },
  { text: "When you arise in the morning think of what a privilege it is to be alive, to think, to enjoy, to love.", author: "Marcus Aurelius" },
  { text: "It is not death that a man should fear, but he should fear never beginning to live.", author: "Marcus Aurelius" },
  { text: "Very little is needed to make a happy life; it is all within yourself in your way of thinking.", author: "Marcus Aurelius" },
  { text: "Reject your sense of injury and the injury itself disappears.", author: "Marcus Aurelius" },
  { text: "Accept the things to which fate binds you, and love the people with whom fate brings you together, but do so with all your heart.", author: "Marcus Aurelius" },
  { text: "Nothing is a better proof of a well ordered mind than a man’s ability to stop just where he is and pass some time in his own company.", author: "Seneca" },
  { text: "Associate with people who are likely to improve you.", author: "Seneca" },
  { text: "If a man knows not to which port he sails, no wind is favorable.", author: "Seneca" },
  { text: "Time discovers truth.", author: "Seneca" },
  { text: "Life, if well lived, is long enough.", author: "Seneca" },
  { text: "Whatever can happen at any time can happen today.", author: "Seneca" },
  { text: "They lose the day in expectation of the night, and the night in fear of the dawn.", author: "Seneca" },
  { text: "Wealth is the slave of a wise man, the master of a fool.", author: "Seneca" },
  { text: "Only the educated are free.", author: "Epictetus" },
  { text: "It is impossible for a man to learn what he thinks he already knows.", author: "Epictetus" },
  { text: "Circumstances don't make the man, they only reveal him to himself.", author: "Epictetus" },
  { text: "Make the best use of what is in your power, and take the rest as it happens.", author: "Epictetus" },
  { text: "Don't seek for everything to happen as you wish it would, but rather wish that everything happens as it actually will—then your life will flow well.", author: "Epictetus" },
  { text: "Know, first, who you are, and then adorn yourself accordingly.", author: "Epictetus" },
  { text: "Silence is safer than speech.", author: "Epictetus" },
  { text: "Curb your desire—don’t set your heart on so many things and you will get what you need.", author: "Epictetus" },
  { text: "Freedom is the only worthy goal in life. It is won by disregarding things that lie beyond our control.", author: "Epictetus" },
  { text: "Be silent for the most part, or, if you speak, say only what is necessary and in a few words.", author: "Epictetus" },
  { text: "The key is to keep company only with people who uplift you, whose presence calls forth your best.", author: "Epictetus" },
  { text: "No great thing is created suddenly.", author: "Epictetus" },
  { text: "Give me the ready hand rather than the ready tongue.", author: "Giuseppe Garibaldi" },
  { text: "He who has a why to live can bear almost any how.", author: "Friedrich Nietzsche" },
  { text: "What we achieve inwardly will change outer reality.", author: "Plutarch" },
  { text: "Silence at the proper season is wisdom, and better than any speech.", author: "Plutarch" },
  { text: "The mind is not a vessel to be filled, but a fire to be kindled.", author: "Plutarch" }
];

// Longer texts for Typing Tax
export const STOIC_TEXTS = [
  "Begin each day by telling yourself: Today I shall be meeting with interference, ingratitude, insolence, disloyalty, ill-will, and selfishness – all of them due to the offenders' ignorance of what is good or evil.",
  "You have power over your mind - not outside events. Realize this, and you will find strength. It is in your power to withdraw yourself whenever you desire. Perfect tranquility within consists in the good ordering of the mind.",
  "It is not that we have a short time to live, but that we waste a lot of it. Life is long enough, and a sufficiently generous amount has been given to us for the highest achievements if it were all well invested.",
  "We suffer more often in imagination than in reality. There are more things, Lucilius, likely to frighten us than there are to crush us; we suffer more often in imagination than in reality."
];

export const getRandomQuote = (): Quote => {
  const randomIndex = Math.floor(Math.random() * STOIC_QUOTES.length);
  return STOIC_QUOTES[randomIndex];
};

export const getRandomText = (): string => {
  const randomIndex = Math.floor(Math.random() * STOIC_TEXTS.length);
  return STOIC_TEXTS[randomIndex];
};
