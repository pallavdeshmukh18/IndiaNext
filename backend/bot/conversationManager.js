const conversations = new Map();

const createDefaultState = (phone) => ({
  phone,
  step: "menu",
  service: null,
  inputType: null,
});

const getConversation = (phone) => {
  if (!conversations.has(phone)) {
    conversations.set(phone, createDefaultState(phone));
  }

  return conversations.get(phone);
};

const updateConversation = (phone, updates) => {
  const currentState = getConversation(phone);
  const nextState = {
    ...currentState,
    ...updates,
  };

  conversations.set(phone, nextState);
  return nextState;
};

const resetConversation = (phone) => {
  const nextState = createDefaultState(phone);
  conversations.set(phone, nextState);
  return nextState;
};

const clearConversation = (phone) => {
  conversations.delete(phone);
};

module.exports = {
  getConversation,
  updateConversation,
  resetConversation,
  clearConversation,
};
