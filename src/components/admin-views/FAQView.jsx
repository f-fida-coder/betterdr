import React, { useState } from 'react';

function FAQView() {
  const [faqs] = useState([
    { id: 1, question: 'How do I create an account?', answer: 'Click on Register and fill in your details. Verify your email and you\'re all set!' },
    { id: 2, question: 'What is the minimum bet amount?', answer: 'The minimum bet amount is $1.00.' },
    { id: 3, question: 'How long does withdrawal take?', answer: 'Withdrawals typically take 24-48 hours to process.' },
    { id: 4, question: 'What payment methods are accepted?', answer: 'We accept credit cards, bank transfers, and e-wallets.' },
    { id: 5, question: 'Can I cancel a bet?', answer: 'You can cancel bets before the match starts. Live bets can be cashed out.' },
  ]);

  return (
    <div className="admin-view">
      <div className="view-header">
        <h2>FAQ Management</h2>
        <button className="btn-primary">Add New FAQ</button>
      </div>
      <div className="view-content">
        <div className="faq-container">
          {faqs.map(faq => (
            <div key={faq.id} className="faq-item">
              <div className="faq-question">
                <h4>Q: {faq.question}</h4>
                <button className="btn-small">Edit</button>
                <button className="btn-small btn-danger">Delete</button>
              </div>
              <div className="faq-answer">
                <p>A: {faq.answer}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default FAQView;
