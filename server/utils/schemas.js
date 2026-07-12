const CHEAT_SHEET_SCHEMA = {
  name: 'cheat_sheet',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['title', 'sections'],
    properties: {
      title: { type: 'string' },
      sections: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['heading', 'blocks'],
          properties: {
            heading: { type: 'string' },
            blocks: {
              type: 'array',
              items: {
                type: 'object',
                additionalProperties: false,
                required: ['type', 'content', 'term', 'items', 'caption'],
                properties: {
                  type: {
                    type: 'string',
                    enum: ['formula', 'definition', 'list', 'example', 'note']
                  },
                  content: { type: 'string' },
                  term: { type: ['string', 'null'] },
                  items: {
                    type: ['array', 'null'],
                    items: { type: 'string' }
                  },
                  caption: { type: ['string', 'null'] }
                }
              }
            }
          }
        }
      }
    }
  }
};

const CLASSIFY_SCHEMA = {
  name: 'classify',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['subject', 'chapter', 'grade', 'folder_name', 'summary', 'tags'],
    properties: {
      subject: { type: 'string' },
      chapter: { type: 'string' },
      grade: { type: 'string' },
      folder_name: { type: 'string' },
      summary: { type: 'string' },
      tags: {
        type: 'array',
        items: { type: 'string' }
      }
    }
  }
};

const PODCAST_SCRIPT_SCHEMA = {
  name: 'podcast_script',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['lines'],
    properties: {
      lines: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['speaker', 'text'],
          properties: {
            speaker: { type: 'string', enum: ['MC_A', 'MC_B'] },
            text: { type: 'string' }
          }
        }
      }
    }
  }
};

const HANDWRITING_SCHEMA = {
  name: 'handwriting_analysis',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['font_family', 'reasoning', 'slant', 'weight'],
    properties: {
      font_family: {
        type: 'string',
        enum: ['Caveat', 'Patrick Hand', 'Dancing Script', 'Pacifico', 'Be Vietnam Pro Italic']
      },
      reasoning: { type: 'string' },
      slant: { type: 'string', enum: ['upright', 'slight-right', 'strong-right', 'left'] },
      weight: { type: 'string', enum: ['thin', 'regular', 'bold'] }
    }
  }
};

const RECOMMENDATIONS_SCHEMA = {
  name: 'recommendations',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['items'],
    properties: {
      items: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['title', 'type', 'language', 'search_query', 'description', 'topic_match', 'source_hint'],
          properties: {
            title: { type: 'string' },
            type: { type: 'string', enum: ['video', 'podcast', 'article'] },
            language: { type: 'string', enum: ['vi', 'en'] },
            search_query: { type: 'string' },
            description: { type: 'string' },
            topic_match: { type: 'string' },
            source_hint: { type: 'string' }
          }
        }
      }
    }
  }
};

const QUIZ_SCHEMA = {
  name: 'quiz_generation',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['questions'],
    properties: {
      questions: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['question', 'options', 'answer', 'explanation', 'topic_tag'],
          properties: {
            question: { type: 'string' },
            options: {
              type: 'array',
              items: { type: 'string' }
            },
            answer: { type: 'string' },
            explanation: { type: 'string' },
            topic_tag: { type: 'string' }
          }
        }
      }
    }
  }
};


const TUTOR_ROADMAP_SCHEMA = {
  name: 'tutor_roadmap',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['summary', 'weaknesses', 'roadmap', 'tips'],
    properties: {
      summary: { type: 'string' },
      weaknesses: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['topic', 'severity', 'evidence'],
          properties: {
            topic: { type: 'string' },
            severity: { type: 'string', enum: ['cao', 'trung bình', 'thấp'] },
            evidence: { type: 'string' }
          }
        }
      },
      roadmap: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['week', 'focus', 'actions', 'goal'],
          properties: {
            week: { type: 'integer' },
            focus: { type: 'string' },
            actions: { type: 'array', items: { type: 'string' } },
            goal: { type: 'string' }
          }
        }
      },
      tips: { type: 'array', items: { type: 'string' } }
    }
  }
};

const MINDMAP_SCHEMA = {
  name: 'mindmap',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['title', 'root'],
    properties: {
      title: { type: 'string' },
      root: {
        type: 'object',
        additionalProperties: false,
        required: ['label', 'children'],
        properties: {
          label: { type: 'string' },
          children: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['label', 'children'],
              properties: {
                label: { type: 'string' },
                children: {
                  type: 'array',
                  items: {
                    type: 'object',
                    additionalProperties: false,
                    required: ['label', 'children'],
                    properties: {
                      label: { type: 'string' },
                      children: { type: ['array', 'null'], items: { type: 'object', additionalProperties: false, required: ['label'], properties: { label: { type: 'string' } } } }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
};

module.exports = {
  CHEAT_SHEET_SCHEMA,
  CLASSIFY_SCHEMA,
  PODCAST_SCRIPT_SCHEMA,
  HANDWRITING_SCHEMA,
  RECOMMENDATIONS_SCHEMA,
  QUIZ_SCHEMA,
  TUTOR_ROADMAP_SCHEMA,
  MINDMAP_SCHEMA
};
