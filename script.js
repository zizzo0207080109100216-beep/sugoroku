document.addEventListener('DOMContentLoaded', () => {
    const setupDiv = document.getElementById('player-setup');
    const gameBoardDiv = document.getElementById('game-board');
    const numPlayersInput = document.getElementById('num-players');
    const playerInputsDiv = document.getElementById('player-inputs');
    const startGameBtn = document.getElementById('start-game-btn');
    
    const rollDiceBtn = document.getElementById('roll-dice');
    const diceDiv = document.getElementById('dice');
    const cells = document.querySelectorAll('.cell');
    const messageBoard = document.getElementById('message-board');
    const cardListDiv = document.getElementById('card-list');
    const turnIndicator = document.getElementById('turn-indicator');
    const sugorokuBoard = document.getElementById('sugoroku-board');
    
    let players = [];
    let currentPlayerIndex = 0;
    const totalCells = cells.length;
    let playersFinished = 0; 

    let extraRolls = 0; // 追加でサイコロを振れる回数

    // --- プレイヤーカラーと名前の定義 ---
    const playerColors = [
        { code: '#ff4500', name: '赤' }, 
        { code: '#0000ff', name: '青' }, 
        { code: '#008000', name: '緑' }, 
        { code: '#ff00ff', name: 'マゼンタ' }
    ];
    
    let cellPositions = [];

    // --- プレイヤー位置の計算と更新 ---
    function calculateCellPositions() {
        cellPositions = Array.from(cells).map(cell => {
            const tokenAdjustments = [
                { top: 5, left: 5 },  
                { top: 25, left: 5 }, 
                { top: 5, left: 25 }, 
                { top: 25, left: 25 } 
            ];
            const rect = cell.getBoundingClientRect(); 
            const boardRect = sugorokuBoard.getBoundingClientRect();

            return tokenAdjustments.map(adj => ({
                top: (rect.top - boardRect.top) + adj.top,
                left: (rect.left - boardRect.left) + adj.left,
            }));
        });
    }
    
    function updatePlayerPosition(playerIndex) {
        const playerToken = document.querySelector(`.player-token[data-player="${playerIndex}"]`);
        if (!playerToken || cellPositions.length === 0) return; 

        const cellIndex = players[playerIndex].position;
        const position = cellPositions[cellIndex] && cellPositions[cellIndex][playerIndex];
        
        if (position) {
            playerToken.style.top = `${position.top}px`;
            playerToken.style.left = `${position.left}px`;
        }
    }
    
    // --- プレイヤー設定ロジック（変更なし） ---
    function createPlayerInputs(num) {
        playerInputsDiv.innerHTML = '';
        for (let i = 0; i < num; i++) {
            const div = document.createElement('div');
            div.innerHTML = `
                <input type="text" id="player-name-${i}" value="プレイヤー ${i + 1}" required>
                <div class="player-color" style="background-color: ${playerColors[i].code};"></div>
            `;
            playerInputsDiv.appendChild(div);
        }
    }

    numPlayersInput.addEventListener('input', (e) => {
        let num = parseInt(e.target.value);
        num = Math.max(1, Math.min(4, num));
        e.target.value = num;
        createPlayerInputs(num);
    });
    createPlayerInputs(parseInt(numPlayersInput.value)); 

    startGameBtn.addEventListener('click', () => {
        const num = parseInt(numPlayersInput.value);
        if (num < 1 || num > 4) return;
        
        players = [];
        for (let i = 0; i < num; i++) {
            const nameInput = document.getElementById(`player-name-${i}`);
            players.push({
                id: i,
                name: nameInput.value || `プレイヤー ${i + 1}`,
                color: playerColors[i].code,
                colorName: playerColors[i].name, 
                position: 0,
                inventory: [],
                isFinished: false,
                isSkipping: false, // 一回休み状態
                cardEffect: null, 
            });
        }

        setupDiv.style.display = 'none';
        gameBoardDiv.style.display = 'block';
        messageBoard.style.display = 'block';
        
        calculateCellPositions(); 

        players.forEach((p, index) => {
            const token = document.createElement('div');
            token.classList.add('player-token');
            token.dataset.player = index;
            token.style.backgroundColor = p.color;
            sugorokuBoard.appendChild(token);
        });

        setTimeout(() => {
            players.forEach((p, index) => {
                updatePlayerPosition(index);
            });

            updateTurnDisplay();
            updateInventoryDisplay();
            updateMessage(`ゲーム開始！ ${players[currentPlayerIndex].name}さん（${players[currentPlayerIndex].colorName}）のターンです。サイコロを振ってください。`, () => {
                rollDiceBtn.disabled = false;
                toggleItemButtons(true);
            });
        }, 50); 
    });

    // --- ターンの管理 ---
    function nextTurn(nextPlayerId = -1) {
        if (playersFinished === players.length) {
            setTimeout(() => {
                if (confirm('全員ゴールしました！ゲームを終了し、もう一度遊びますか？')) {
                    location.reload();
                }
            }, 2000);
            return;
        }

        if (extraRolls > 0) {
            extraRolls--;
            updateTurnDisplay();
            updateMessage(`${players[currentPlayerIndex].name}さんは**もう一回サイコロを振れます**！残り${extraRolls}回。`, () => {
                 rollDiceBtn.disabled = false;
                 toggleItemButtons(true);
            });
            return;
        }
        
        let nextIndex = nextPlayerId !== -1 ? players.findIndex(p => p.id === nextPlayerId) : currentPlayerIndex;

        do {
            nextIndex = (nextIndex + 1) % players.length;
        } while (players[nextIndex].isFinished && nextIndex !== currentPlayerIndex); 
        
        currentPlayerIndex = nextIndex;
        const currentPlayer = players[currentPlayerIndex];

        if (currentPlayer.isFinished) {
            nextTurn();
            return;
        }
        
        currentPlayer.cardEffect = null;
        
        if (currentPlayer.isSkipping) {
            currentPlayer.isSkipping = false;
            updateTurnDisplay();
            updateMessage(`${currentPlayer.name}さん（${currentPlayer.colorName}）は**一回休み**です。次のプレイヤーに交代します。`, nextTurn);
            return;
        }
        
        updateTurnDisplay();
        updateInventoryDisplay();
        updateMessage(`ターン交代！ ${currentPlayer.name}さん（${currentPlayer.colorName}）のターンです。サイコロを振ってください。`, () => {
            rollDiceBtn.disabled = false;
            toggleItemButtons(true);
        });
    }

    function updateTurnDisplay() {
        const currentPlayer = players[currentPlayerIndex];
        let status = '';
        if (currentPlayer.isSkipping) status = '(一回休み)';
        if (extraRolls > 0) status = `(残り${extraRolls}回サイコロ)`;

        turnIndicator.innerHTML = `現在のターン: <span style="color: ${currentPlayer.color};">${currentPlayer.name}（${currentPlayer.colorName}）</span> ${status}`;
    }

    // --- アイテムカード定義 ---
    const itemCards = [
        { name: "知識カード", type: 'quiz_skip', effect: () => 'skip_quiz', description: "次のクイズマスは自動的に正解扱いになる。（クイズスキップ）" },
        { name: "もう一回カード", type: 'extra_turn', effect: () => 'extra_turn', description: "自分のターンを終えた後、もう一度サイコロを振れる。（追加ターン）" },
        { name: "観察力カード", type: 'quiz_hint', effect: () => 'quiz_hint', description: "次のクイズに挑戦する前に、正解の解説文を読める。（ヒント表示）" },
        { name: "ロールチェンジ", type: 'turn_control', effect: () => 'change_turn', description: "自分のターンを終える前に、次のターンを任意のプレイヤーに譲る。" },
        { name: "一回休みカード", type: 'skip_target', effect: () => 'skip_target', description: "自分以外のランダムなプレイヤーを次のターン一回休み状態にする。" },
    ];

    function updateInventoryDisplay() {
        const currentPlayer = players[currentPlayerIndex];
        cardListDiv.innerHTML = '';
        if (currentPlayer.inventory.length === 0) {
            cardListDiv.innerHTML = 'なし';
            return;
        }

        currentPlayer.inventory.forEach((cardName, index) => {
            const cardButton = document.createElement('button');
            const cardData = itemCards.find(c => c.name === cardName);
            
            cardButton.classList.add('card-item');
            cardButton.textContent = cardName;
            cardButton.title = cardData.description;
            cardButton.dataset.index = index;
            cardButton.dataset.cardType = cardData.type;
            
            cardButton.addEventListener('click', () => {
                const isTurnEndCard = cardData.type === 'turn_control' || cardData.type === 'skip_target';
                
                // ターン終了後のカードは、rollDiceBtn.disabledがtrueのときに使えるようにする
                if (!isTurnEndCard && rollDiceBtn.disabled) return; 
                // ターン終了後のカードは、rollDiceBtn.disabledがfalseのときは使えないようにする
                if (isTurnEndCard && !rollDiceBtn.disabled) return; 
                // extra_turnはrollDiceBtn.disabledがfalseのときに使える

                if (confirm(`${cardName}を使用しますか？\n(${cardData.description})`)) {
                    handleCardUse(index, cardData);
                }
            });

            cardListDiv.appendChild(cardButton);
        });

        toggleItemButtons(!rollDiceBtn.disabled); 
        
        // ターン終了後（rollDiceBtn.disabledがtrue）のカードの処理
        if (rollDiceBtn.disabled) {
            Array.from(cardListDiv.children).forEach(btn => {
                const type = btn.dataset.cardType;
                const otherPlayersExist = players.filter(p => p.id !== currentPlayer.id && !p.isFinished).length > 0;
                
                if ((type === 'turn_control' || type === 'skip_target') && players.length > 1 && otherPlayersExist) { 
                    btn.disabled = false; // 複数プレイヤーがいる場合のみ有効
                }
            });
        }
    }

    function toggleItemButtons(canUse) {
        Array.from(cardListDiv.children).forEach(btn => {
            const type = btn.dataset.cardType;
            if (type !== 'turn_control' && type !== 'skip_target') {
                btn.disabled = !canUse;
            }
        });
    }

    function handleCardUse(index, cardData) {
        const currentPlayer = players[currentPlayerIndex];
        
        currentPlayer.inventory.splice(index, 1);
        updateInventoryDisplay();

        if (cardData.type === 'quiz_skip') {
            currentPlayer.cardEffect = { type: 'quiz_skip' }; 
            updateMessage(`「${cardData.name}」を使用！次のクイズマスは自動的に正解扱いになります。`, () => {
                toggleItemButtons(false);
                rollDiceBtn.disabled = false;
            });
        } else if (cardData.type === 'quiz_hint') {
            currentPlayer.cardEffect = { type: 'quiz_hint' };
            updateMessage(`「${cardData.name}」を使用！次のクイズのヒント（解説）が自動表示されます。`, () => {
                toggleItemButtons(false);
                rollDiceBtn.disabled = false;
            });
        } else if (cardData.type === 'extra_turn') {
            extraRolls += 1;
            updateMessage(`「${cardData.name}」を使用！今回のターンが終わった後、もう一度サイコロを振れます。`, () => {
                rollDiceBtn.disabled = false;
                toggleItemButtons(true);
            });
        } else if (cardData.type === 'turn_control') {
            const otherPlayers = players.filter(p => p.id !== currentPlayer.id && !p.isFinished);
            if (players.length <= 1 || otherPlayers.length === 0) {
                 updateMessage(`他のプレイヤーがいないため、効果はありませんでした。`, nextTurn);
                 return;
            }
            const playerNames = otherPlayers.map(p => `[${p.id}] ${p.name}（${p.colorName}）`).join('\n');
            const targetId = prompt(`誰に次のターンを譲りますか？\n（IDを入力してください）\n${playerNames}`);
            
            const targetPlayer = otherPlayers.find(p => p.id === parseInt(targetId));
            
            if (targetPlayer) {
                updateMessage(`「${cardData.name}」を使用！次のターンは${targetPlayer.name}さんになります。`, () => {
                    nextTurn(targetPlayer.id);
                });
            } else {
                updateMessage(`プレイヤーIDが無効です。ターンはそのまま次の人に移ります。`, nextTurn);
            }
        } else if (cardData.type === 'skip_target') {
             const otherPlayers = players.filter(p => p.id !== currentPlayer.id && !p.isFinished);
            if (players.length <= 1 || otherPlayers.length === 0) {
                 updateMessage(`他のプレイヤーがいないため、効果はありませんでした。`, nextTurn);
                 return;
            }
            
            // ランダムで一人を選ぶ
            const randomIndex = Math.floor(Math.random() * otherPlayers.length);
            const targetPlayer = otherPlayers[randomIndex];
            
            if (targetPlayer) {
                targetPlayer.isSkipping = true;
                updateMessage(`「${cardData.name}」を使用！ランダムで選ばれた${targetPlayer.name}さんの次のターンは**一回休み**になります。`, nextTurn);
            } else {
                updateMessage(`次のプレイヤーに譲ります。`, nextTurn); // 念のため
            }
        }
    }

    function giveRandomCard() {
        const currentPlayer = players[currentPlayerIndex];
        
        const hasKnowledgeCard = currentPlayer.inventory.includes('知識カード');
        const availableCards = itemCards.filter(c => c.name !== '知識カード' || !hasKnowledgeCard); 
        
        if (availableCards.length === 0) return "全てのカードを所持しているため、カードは増えませんでした。";

        const newCard = availableCards[Math.floor(Math.random() * availableCards.length)];
        currentPlayer.inventory.push(newCard.name);
        updateInventoryDisplay();
        return `「${newCard.name}」を獲得しました！ (${newCard.description})`;
    }

    // --- メッセージ・サイコロ表示関数（変更なし） ---
    function updateMessage(message, callback) {
        let currentText = '';
        let i = 0;
        messageBoard.innerHTML = '<p></p>';
        const p = messageBoard.querySelector('p');
        function type() {
            if (i < message.length) {
                currentText += message.charAt(i);
                p.innerHTML = currentText;
                i++;
                setTimeout(type, 20);
            } else {
                if (callback) {
                    setTimeout(callback, 1000); 
                }
            }
        }
        type();
    }

    function renderDice(number) {
        const dotPositions = {
            1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8]
        };
        diceDiv.innerHTML = '';
        if (number === 0) return;
        const positions = dotPositions[number];
        for (let i = 0; i < 9; i++) {
            const dotWrapper = document.createElement('div');
            if (positions.includes(i)) {
                const dot = document.createElement('div');
                dot.classList.add('dice-dot');
                dotWrapper.appendChild(dot);
            }
            diceDiv.appendChild(dotWrapper);
        }
    }
    renderDice(0); 
    
    // --- クイズ定義の修正 ---
    const quizzes = {
        2: { 
            question: '【クイズ3】倒れている人を発見しました。最初にすべき行動の順番は？\n（A:胸骨圧迫 B:周囲の安全確認 C:119番通報とAED手配）', 
            answer: 'b c a', 
            isOrderQuiz: true,
            correct_text: '正解！最初は「**B:周囲の安全確認**」です。次に「**C:119番通報とAED手配**」、最後に「**A:胸骨圧迫**」です。', 
            prompt_text: '3つの行動（A:胸骨圧迫, B:周囲の安全確認, C:119番通報）を正しい順番でスペース区切りで入力してください。（例: B C A）'
        },
        8: { question: '【クイズ9】AEDが到着したら、まず何をすべき？\n（A:胸骨圧迫を続ける B:AEDの電源を入れる C:パッドを剥がす）', answer: 'b', isOrderQuiz: false, correct_text: 'AEDが到着したら、迷わず電源を入れましょう。その後の操作はAEDが音声でガイドしてくれます。' },
        12: { question: '【クイズ13】AEDが「電気ショックが必要です」と音声ガイドしたら、何をすべき？\n（A:胸骨圧迫を続ける B:周りに「離れてください」と声をかけ、ショックボタンを押す C:AEDの電源を切る）', answer: 'b', isOrderQuiz: false, correct_text: '周りに「離れてください！」と大きな声で伝え、誰も触れていないことを確認してからショックボタンを押します。' },
        14: { // 質問文修正
            question: '【クイズ15】電気ショックの直後、何をすべきですか？\n（A:様子を見て心拍の回復を待つ B:すぐに胸骨圧迫を再開する C:AEDの音声ガイドが終わるまで待つ）', 
            answer: 'b', 
            isOrderQuiz: false, 
            correct_text: '正解は「**B:すぐに胸骨圧迫を再開する**」です。ショック後、間をおかずに蘇生を再開することが、救命率を上げるために最も重要です。' 
        },
        18: { // 選択肢修正
            question: '【クイズ19】心肺蘇生を中断して良いタイミングは？\n（A:疲労を感じたとき B:救急隊が到着し、処置を引き継いでくれるとき C:家族から中断を求められたとき）', 
            answer: 'b', 
            isOrderQuiz: false, 
            correct_text: '救急隊が到着し、処置を引き継いでくれるか、傷病者の呼吸・意識が回復するまで絶対に中断してはいけません。AとCは救命の妨げになります。' 
        },
        22: { question: '【クイズ23】AEDの「A」は何の略？\n（A:Automatic B:Assistant C:Active）', answer: 'a', isOrderQuiz: false, correct_text: 'AEDのAはAutomatic（自動化された）の略です。AEDは心臓の電気的な異常を自動的に解析し、ショックが必要か判断します。' }
    };

    // --- メインゲームロジック ---
    function handleLandOnCell(position) {
        const currentPlayer = players[currentPlayerIndex];
        const cell = cells[position];
        const cellType = cell.classList.contains('quiz') ? 'quiz' : cell.classList.contains('event') ? 'event' : cell.classList.contains('card') ? 'card' : 'action';
        const cellInfo = cell.dataset.info;
        const cellName = cell.firstChild.textContent.trim();
        
        rollDiceBtn.disabled = true;
        toggleItemButtons(false);

        let followUpAction = nextTurn;

        if (cellType === 'event') {
            const skipChance = Math.random();
            let eventMessage = `「${cellName}」<br><b>解説：</b>${cellInfo}`;

            if (skipChance < 0.25) { // 25%の確率で一回休み
                currentPlayer.isSkipping = true;
                eventMessage += `<br>🚨**イベント発生！** 次のあなたのターンは**一回休み**になります！`;
            } else if (skipChance < 0.50) { // 25%の確率でカード獲得
                 const cardMsg = giveRandomCard(); 
                 eventMessage += `<br>🎁**イベント発生！** ${cardMsg}`;
            }

            updateMessage(eventMessage, followUpAction);
            return;
        }

        if (cellType === 'quiz' && quizzes[position]) {
            const quiz = quizzes[position];
            
            let hintMessage = '';
            if (currentPlayer.cardEffect && currentPlayer.cardEffect.type === 'quiz_hint') {
                hintMessage = `\n\n【観察力カード発動！】\nヒント：${quiz.correct_text}`;
                currentPlayer.cardEffect = null; 
            }

            if (currentPlayer.cardEffect && currentPlayer.cardEffect.type === 'quiz_skip') {
                currentPlayer.cardEffect = null; 
                updateInventoryDisplay(); 
                updateMessage(`知識カードの効果で、クイズをスキップし、自動的に正解としました！🎉<br><b>解説：</b>${quiz.correct_text}`, followUpAction);
                return;
            }
            
            const promptText = quiz.isOrderQuiz ? quiz.prompt_text + hintMessage : quiz.question.replace(/\n/g, '\n') + hintMessage;

            const userAnswer = prompt(promptText);
            
            let isCorrect = false;
            if (userAnswer) {
                const normalizedAnswer = userAnswer.trim().toLowerCase().replace(/\s+/g, ' ');
                isCorrect = normalizedAnswer === quiz.answer;
            }

            if (isCorrect) {
                const cardMsg = giveRandomCard(); 
                updateMessage(`正解！🎉<br><b>解説：</b>${quiz.correct_text}<br>【カード獲得】${cardMsg}`, followUpAction);
            } else {
                updateMessage(`不正解…残念！😢<br><b>解説：</b>${quiz.correct_text}`, () => {
                    if (currentPlayer.position > 0) {
                        currentPlayer.position = Math.max(0, currentPlayer.position - 1);
                        updatePlayerPosition(currentPlayerIndex);
                        updateMessage(`不正解のため、<b>1マス戻ります！</b> 現在地は${currentPlayer.position + 1}マス目です。`, followUpAction);
                    } else {
                        updateMessage(`スタート地点に留まります。`, followUpAction);
                    }
                });
            }
        } else if (cellType === 'card') {
            const cardMsg = giveRandomCard();
            updateMessage(`「${cellName}」に止まった！<br><b>解説：</b>${cellInfo}<br>【カード獲得】${cardMsg}`, followUpAction);
        } else if (cell.classList.contains('goal')) {
            updateMessage(`「${cellName}」<br><b>最終確認：</b>${cellInfo}`, () => {});
        } else {
            updateMessage(`「${cellName}」<br><b>解説：</b>${cellInfo}`, followUpAction);
        }
    }

    function movePlayerOneStep(stepsLeft) {
        const currentPlayer = players[currentPlayerIndex];
        
        if (stepsLeft === 0) {
            handleLandOnCell(currentPlayer.position);
            return;
        }
        
        let nextPosition = currentPlayer.position + 1;

        if (nextPosition >= totalCells) { 
            nextPosition = totalCells - 1; 
            
            updateMessage(`サイコロの出た目が大きすぎましたが、ゴールにぴったり止まります。`, () => {
                currentPlayer.position = nextPosition;
                updatePlayerPosition(currentPlayerIndex);
                
                setTimeout(() => {
                    updateMessage(`<b>ゴール！おめでとうございます！</b><br>${currentPlayer.name}さんは、勇気ある**バイスタンダー**として人命救助の行動を完遂しました！👏`, () => {
                        currentPlayer.isFinished = true;
                        playersFinished++;
                        rollDiceBtn.disabled = true;
                        toggleItemButtons(false);
                        
                        if (playersFinished < players.length) {
                            updateMessage(`${currentPlayer.name}さんが${playersFinished}位でゴールしました！次の${playersFinished + 1}位を目指してゲームを続けます。`, nextTurn);
                        } else {
                            updateMessage(`全員ゴールしました！ゲーム終了です。`, nextTurn);
                        }
                    });
                }, 500);
            });
            return; 
        }

        currentPlayer.position = nextPosition;
        updatePlayerPosition(currentPlayerIndex);

        setTimeout(() => {
            movePlayerOneStep(stepsLeft - 1); 
        }, 400);
    }

    rollDiceBtn.addEventListener('click', () => {
        const currentPlayer = players[currentPlayerIndex];
        if (currentPlayer.isFinished) return;
        
        rollDiceBtn.disabled = true;
        toggleItemButtons(false); 
        diceDiv.classList.add('rolling');
        
        let rollCount = 0;
        const rollInterval = setInterval(() => {
            const tempRoll = Math.floor(Math.random() * 6) + 1;
            renderDice(tempRoll);
            rollCount++;
            if (rollCount > 10) {
                clearInterval(rollInterval);
                diceDiv.classList.remove('rolling');
                let finalRoll = Math.floor(Math.random() * 6) + 1;
                
                renderDice(finalRoll); 
                updateMessage(`サイコロの出た目は【${finalRoll}】です！`, () => {
                    movePlayerOneStep(finalRoll);
                });
            }
        }, 100);
    });
});