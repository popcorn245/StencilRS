import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components';

const meta: Meta = {
  title: 'Components/Organisms/SwipeCards',
  component: 'pop-swipe-cards',
  parameters: {
    layout: 'centered',
  },
  render: (args: any) => html`
    <pop-swipe-cards>
      ${args.cards.map((card: any) => html`
        <article>
          <img src="${card.image}" alt="${card.title}">
          <h2>${card.title}</h2>
          <p>${card.description}</p>
        </article>
      `)}
    </pop-swipe-cards>
  `,
};

export default meta;

const defaultCards = [
  { title: 'Golden Retriever', description: 'Loyal, friendly and active. Great for families.', image: 'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=800&q=80' },
  { title: 'Siberian Husky', description: 'Energetic, outgoing and athletic. Loves the snow.', image: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?auto=format&fit=crop&w=800&q=80' },
  { title: 'French Bulldog', description: 'Playful, adaptable and smart. Perfect for city life.', image: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=800&q=80' },
  { title: 'Border Collie', description: 'Intelligent, hard-working and energetic.', image: 'https://images.unsplash.com/photo-1503256207526-0d5d80fa2f47?auto=format&fit=crop&w=800&q=80' },
  { title: 'Corgi', description: 'Happy, affectionate and alert.', image: 'https://images.unsplash.com/photo-1513284499445-c824ce2d4f49?auto=format&fit=crop&w=800&q=80' },
];

// Scoped to .swipe-cards-story to prevent leaking into other Storybook stories
const cardStyles = html`
  <style>
    .swipe-cards-story article {
      position: absolute;
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
    }
    .swipe-cards-story article img {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      z-index: -2;
    }
    .swipe-cards-story article::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      height: 60%;
      background: linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0) 100%);
      z-index: -1;
    }
    .swipe-cards-story article .content {
      padding: 1.5rem;
      color: white;
      text-shadow: 0 1px 4px rgba(0,0,0,0.5);
    }
    .swipe-cards-story article h2 {
      margin: 0 0 0.5rem 0;
      font-size: 2rem;
      font-weight: 700;
      color: white;
    }
    .swipe-cards-story article p {
      margin: 0;
      font-size: 1.1rem;
      line-height: 1.4;
      opacity: 0.9;
      color: #f1f5f9;
    }
  </style>
`;

const cardTemplate = (card: any) => html`
  <article>
    <img src="${card.image}" alt="${card.title}" draggable="false">
    <div style="flex: 1"></div>
    <div class="content">
      <h2>${card.title}</h2>
      <p>${card.description}</p>
    </div>
  </article>
`;

export const Default: StoryObj = {
  args: {
    cards: defaultCards,
  },
  render: (args: any) => html`
    ${cardStyles}
    <div class="swipe-cards-story">
      <pop-swipe-cards>
        ${args.cards.map(cardTemplate)}
      </pop-swipe-cards>
    </div>
  `,
};

export const EmptyState: StoryObj = {
  args: {
    cards: [],
  },
};

export const SingleCard: StoryObj = {
  args: {
    cards: [defaultCards[0]],
  },
  render: Default.render,
};

const quizQuestions = [
  { question: 'Do you have a clearly defined target user?', category: 'Discovery' },
  { question: 'Have you validated the idea with at least one potential user?', category: 'Discovery' },
  { question: 'Do you need user authentication?', category: 'Technical' },
  { question: 'Will the app require real-time data updates?', category: 'Technical' },
  { question: 'Are you planning to build mobile-first?', category: 'Design' },
  { question: 'Do you have existing mockups or wireframes?', category: 'Design' },
  { question: 'Will you need to integrate third-party APIs?', category: 'Integrations' },
  { question: 'Do you need offline support?', category: 'Technical' },
  { question: 'Are you planning to monetize from day one?', category: 'Business' },
  { question: 'Will this need to scale to thousands of users in year one?', category: 'Business' },
];

// Subtle per-card accent colours for the category pill only
const quizAccents = ['#a78bfa', '#f472b6', '#38bdf8', '#34d399', '#fb923c', '#a78bfa', '#f472b6', '#38bdf8', '#34d399', '#fb923c'];

export const AppBuilderQuiz: StoryObj = {
  render: () => {
    const answers: Array<{ question: string; direction: 'yes' | 'no'; context: string }> = [];

    const handleSwipe = (direction: 'yes' | 'no', index: number) => {
      const input = document.getElementById('quiz-context') as HTMLTextAreaElement;
      answers.push({ question: quizQuestions[index]?.question ?? '', direction, context: input?.value ?? '' });
      if (input) input.value = '';

      const log = document.getElementById('quiz-log');
      if (log) {
        log.innerHTML = answers.map(a => `
          <div style="display:flex;gap:10px;align-items:flex-start;padding:8px 0;border-bottom:1px solid rgba(0,0,0,0.06)">
            <span style="font-size:0.8rem;font-weight:700;color:${a.direction === 'yes' ? '#4cd964' : '#ff4458'};min-width:28px;padding-top:1px">${a.direction === 'yes' ? 'Yes' : 'No'}</span>
            <div>
              <div style="font-size:0.85rem;line-height:1.3">${a.question}</div>
              ${a.context ? `<div style="font-size:0.75rem;color:#888;margin-top:3px;font-style:italic">${a.context}</div>` : ''}
            </div>
          </div>
        `).join('');
      }
    };

    return html`
      <style>
        .quiz-outer {
          width: 400px;
        }
        .quiz-deck-wrapper {
          position: relative;
          width: 100%;
        }
        .quiz-deck-wrapper article {
          position: absolute;
          width: 100%;
          height: 100%;
          margin: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2.5rem 2rem 8rem;
          box-sizing: border-box;
        }
        .quiz-deck-wrapper .q-category {
          font-size: 0.68rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: white;
          opacity: 0.75;
          margin: 0 0 1.5rem;
        }
        .quiz-deck-wrapper .q-text {
          font-size: 1.5rem;
          font-weight: 600;
          color: white;
          text-align: center;
          line-height: 1.4;
          margin: 0;
        }
        .quiz-deck-wrapper .q-hint {
          position: absolute;
          bottom: 1.75rem;
          left: 2rem;
          right: 2rem;
          display: flex;
          justify-content: space-between;
          font-size: 0.72rem;
          font-weight: 500;
          color: rgba(255,255,255,0.4);
          letter-spacing: 0.04em;
        }
        /* Sits just above the yes/no buttons (~104px from bottom) */
        .quiz-context-input {
          position: absolute;
          bottom: 116px;
          left: 16px;
          right: 16px;
          z-index: 10;
          box-sizing: border-box;
          padding: 0.65rem 0.9rem;
          border-radius: 10px;
          border: none;
          border-bottom: 1px solid rgba(255,255,255,0.4);
          background: transparent;
          font-size: 0.875rem;
          resize: none;
          font-family: inherit;
          color: white;
          line-height: 1.4;
          outline: none;
        }
        .quiz-context-input:focus {
          border-bottom-color: rgba(255,255,255,0.8);
        }
        .quiz-context-input::placeholder { color: rgba(255,255,255,0.45); }
        .quiz-log {
          width: 100%;
          max-height: 180px;
          overflow-y: auto;
          margin-top: 1rem;
        }
      </style>
      <div class="quiz-outer">
        <div class="quiz-deck-wrapper">
          <pop-swipe-cards
            @popSwipeYes=${(e: any) => handleSwipe('yes', e.detail.index)}
            @popSwipeNo=${(e: any) => handleSwipe('no', e.detail.index)}
          >
            ${quizQuestions.map((q, i) => html`
              <article style="background: ${quizAccents[i]}">
                <span class="q-category">${q.category}</span>
                <p class="q-text">${q.question}</p>
                <div class="q-hint"><span>← No</span><span>Yes →</span></div>
              </article>
            `)}
          </pop-swipe-cards>
          <textarea
            id="quiz-context"
            class="quiz-context-input"
            rows="2"
            placeholder="Add context… (clears on swipe)"
          ></textarea>
        </div>
        <div id="quiz-log" class="quiz-log"></div>
      </div>
    `;
  },
};

export const ProgrammaticControl: StoryObj = {
  args: {
    cards: defaultCards.slice(0, 3),
  },
  render: (args: any) => html`
    ${cardStyles}
    <div class="swipe-cards-story">
      <pop-swipe-cards hide-controls id="deck">
        ${args.cards.map(cardTemplate)}
      </pop-swipe-cards>
      <div style="margin-top: 1rem; display: flex; gap: 1rem; justify-content: center;">
        <button onclick="document.getElementById('deck').swipeNo()" style="padding: 10px 20px; border-radius: 8px; border: 1px solid #ccc; cursor: pointer;">No</button>
        <button onclick="document.getElementById('deck').swipeYes()" style="padding: 10px 20px; border-radius: 8px; border: 1px solid #7c3aed; background: #7c3aed; color: white; cursor: pointer;">Yes</button>
      </div>
    </div>
  `,
};
