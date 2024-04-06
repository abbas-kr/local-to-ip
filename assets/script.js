(() => {
    // node_modules/alpinejs/dist/module.esm.js
    var flushPending = false;
    var flushing = false;
    var queue = [];
    var lastFlushedIndex = -1;
    function scheduler(callback) {
        queueJob(callback);
    }
    function queueJob(job) {
        if (!queue.includes(job))
            queue.push(job);
        queueFlush();
    }
    function dequeueJob(job) {
        let index = queue.indexOf(job);
        if (index !== -1 && index > lastFlushedIndex)
            queue.splice(index, 1);
    }
    function queueFlush() {
        if (!flushing && !flushPending) {
            flushPending = true;
            queueMicrotask(flushJobs);
        }
    }
    function flushJobs() {
        flushPending = false;
        flushing = true;
        for (let i = 0; i < queue.length; i++) {
            queue[i]();
            lastFlushedIndex = i;
        }
        queue.length = 0;
        lastFlushedIndex = -1;
        flushing = false;
    }
    var reactive;
    var effect;
    var release;
    var raw;
    var shouldSchedule = true;
    function disableEffectScheduling(callback) {
        shouldSchedule = false;
        callback();
        shouldSchedule = true;
    }
    function setReactivityEngine(engine) {
        reactive = engine.reactive;
        release = engine.release;
        effect = (callback) => engine.effect(callback, { scheduler: (task) => {
                if (shouldSchedule) {
                    scheduler(task);
                } else {
                    task();
                }
            } });
        raw = engine.raw;
    }
    function overrideEffect(override) {
        effect = override;
    }
    function elementBoundEffect(el) {
        let cleanup2 = () => {
        };
        let wrappedEffect = (callback) => {
            let effectReference = effect(callback);
            if (!el._x_effects) {
                el._x_effects = /* @__PURE__ */ new Set();
                el._x_runEffects = () => {
                    el._x_effects.forEach((i) => i());
                };
            }
            el._x_effects.add(effectReference);
            cleanup2 = () => {
                if (effectReference === void 0)
                    return;
                el._x_effects.delete(effectReference);
                release(effectReference);
            };
            return effectReference;
        };
        return [wrappedEffect, () => {
            cleanup2();
        }];
    }
    function watch(getter, callback) {
        let firstTime = true;
        let oldValue;
        let effectReference = effect(() => {
            let value = getter();
            JSON.stringify(value);
            if (!firstTime) {
                queueMicrotask(() => {
                    callback(value, oldValue);
                    oldValue = value;
                });
            } else {
                oldValue = value;
            }
            firstTime = false;
        });
        return () => release(effectReference);
    }
    function dispatch(el, name, detail = {}) {
        el.dispatchEvent(
            new CustomEvent(name, {
                detail,
                bubbles: true,
                // Allows events to pass the shadow DOM barrier.
                composed: true,
                cancelable: true
            })
        );
    }
    function walk(el, callback) {
        if (typeof ShadowRoot === "function" && el instanceof ShadowRoot) {
            Array.from(el.children).forEach((el2) => walk(el2, callback));
            return;
        }
        let skip = false;
        callback(el, () => skip = true);
        if (skip)
            return;
        let node = el.firstElementChild;
        while (node) {
            walk(node, callback, false);
            node = node.nextElementSibling;
        }
    }
    function warn(message, ...args) {
        console.warn(`Alpine Warning: ${message}`, ...args);
    }
    var started = false;
    function start() {
        if (started)
            warn("Alpine has already been initialized on this page. Calling Alpine.start() more than once can cause problems.");
        started = true;
        if (!document.body)
            warn("Unable to initialize. Trying to load Alpine before `<body>` is available. Did you forget to add `defer` in Alpine's `<script>` tag?");
        dispatch(document, "alpine:init");
        dispatch(document, "alpine:initializing");
        startObservingMutations();
        onElAdded((el) => initTree(el, walk));
        onElRemoved((el) => destroyTree(el));
        onAttributesAdded((el, attrs) => {
            directives(el, attrs).forEach((handle) => handle());
        });
        let outNestedComponents = (el) => !closestRoot(el.parentElement, true);
        Array.from(document.querySelectorAll(allSelectors().join(","))).filter(outNestedComponents).forEach((el) => {
            initTree(el);
        });
        dispatch(document, "alpine:initialized");
    }
    var rootSelectorCallbacks = [];
    var initSelectorCallbacks = [];
    function rootSelectors() {
        return rootSelectorCallbacks.map((fn2) => fn2());
    }
    function allSelectors() {
        return rootSelectorCallbacks.concat(initSelectorCallbacks).map((fn2) => fn2());
    }
    function addRootSelector(selectorCallback) {
        rootSelectorCallbacks.push(selectorCallback);
    }
    function addInitSelector(selectorCallback) {
        initSelectorCallbacks.push(selectorCallback);
    }
    function closestRoot(el, includeInitSelectors = false) {
        return findClosest(el, (element) => {
            const selectors = includeInitSelectors ? allSelectors() : rootSelectors();
            if (selectors.some((selector) => element.matches(selector)))
                return true;
        });
    }
    function findClosest(el, callback) {
        if (!el)
            return;
        if (callback(el))
            return el;
        if (el._x_teleportBack)
            el = el._x_teleportBack;
        if (!el.parentElement)
            return;
        return findClosest(el.parentElement, callback);
    }
    function isRoot(el) {
        return rootSelectors().some((selector) => el.matches(selector));
    }
    var initInterceptors = [];
    function interceptInit(callback) {
        initInterceptors.push(callback);
    }
    function initTree(el, walker = walk, intercept = () => {
    }) {
        deferHandlingDirectives(() => {
            walker(el, (el2, skip) => {
                intercept(el2, skip);
                initInterceptors.forEach((i) => i(el2, skip));
                directives(el2, el2.attributes).forEach((handle) => handle());
                el2._x_ignore && skip();
            });
        });
    }
    function destroyTree(root) {
        walk(root, (el) => {
            cleanupAttributes(el);
            cleanupElement(el);
        });
    }
    var onAttributeAddeds = [];
    var onElRemoveds = [];
    var onElAddeds = [];
    function onElAdded(callback) {
        onElAddeds.push(callback);
    }
    function onElRemoved(el, callback) {
        if (typeof callback === "function") {
            if (!el._x_cleanups)
                el._x_cleanups = [];
            el._x_cleanups.push(callback);
        } else {
            callback = el;
            onElRemoveds.push(callback);
        }
    }
    function onAttributesAdded(callback) {
        onAttributeAddeds.push(callback);
    }
    function onAttributeRemoved(el, name, callback) {
        if (!el._x_attributeCleanups)
            el._x_attributeCleanups = {};
        if (!el._x_attributeCleanups[name])
            el._x_attributeCleanups[name] = [];
        el._x_attributeCleanups[name].push(callback);
    }
    function cleanupAttributes(el, names) {
        if (!el._x_attributeCleanups)
            return;
        Object.entries(el._x_attributeCleanups).forEach(([name, value]) => {
            if (names === void 0 || names.includes(name)) {
                value.forEach((i) => i());
                delete el._x_attributeCleanups[name];
            }
        });
    }
    function cleanupElement(el) {
        if (el._x_cleanups) {
            while (el._x_cleanups.length)
                el._x_cleanups.pop()();
        }
    }
    var observer = new MutationObserver(onMutate);
    var currentlyObserving = false;
    function startObservingMutations() {
        observer.observe(document, { subtree: true, childList: true, attributes: true, attributeOldValue: true });
        currentlyObserving = true;
    }
    function stopObservingMutations() {
        flushObserver();
        observer.disconnect();
        currentlyObserving = false;
    }
    var queuedMutations = [];
    function flushObserver() {
        let records = observer.takeRecords();
        queuedMutations.push(() => records.length > 0 && onMutate(records));
        let queueLengthWhenTriggered = queuedMutations.length;
        queueMicrotask(() => {
            if (queuedMutations.length === queueLengthWhenTriggered) {
                while (queuedMutations.length > 0)
                    queuedMutations.shift()();
            }
        });
    }
    function mutateDom(callback) {
        if (!currentlyObserving)
            return callback();
        stopObservingMutations();
        let result = callback();
        startObservingMutations();
        return result;
    }
    var isCollecting = false;
    var deferredMutations = [];
    function deferMutations() {
        isCollecting = true;
    }
    function flushAndStopDeferringMutations() {
        isCollecting = false;
        onMutate(deferredMutations);
        deferredMutations = [];
    }
    function onMutate(mutations) {
        if (isCollecting) {
            deferredMutations = deferredMutations.concat(mutations);
            return;
        }
        let addedNodes = /* @__PURE__ */ new Set();
        let removedNodes = /* @__PURE__ */ new Set();
        let addedAttributes = /* @__PURE__ */ new Map();
        let removedAttributes = /* @__PURE__ */ new Map();
        for (let i = 0; i < mutations.length; i++) {
            if (mutations[i].target._x_ignoreMutationObserver)
                continue;
            if (mutations[i].type === "childList") {
                mutations[i].addedNodes.forEach((node) => node.nodeType === 1 && addedNodes.add(node));
                mutations[i].removedNodes.forEach((node) => node.nodeType === 1 && removedNodes.add(node));
            }
            if (mutations[i].type === "attributes") {
                let el = mutations[i].target;
                let name = mutations[i].attributeName;
                let oldValue = mutations[i].oldValue;
                let add2 = () => {
                    if (!addedAttributes.has(el))
                        addedAttributes.set(el, []);
                    addedAttributes.get(el).push({ name, value: el.getAttribute(name) });
                };
                let remove = () => {
                    if (!removedAttributes.has(el))
                        removedAttributes.set(el, []);
                    removedAttributes.get(el).push(name);
                };
                if (el.hasAttribute(name) && oldValue === null) {
                    add2();
                } else if (el.hasAttribute(name)) {
                    remove();
                    add2();
                } else {
                    remove();
                }
            }
        }
        removedAttributes.forEach((attrs, el) => {
            cleanupAttributes(el, attrs);
        });
        addedAttributes.forEach((attrs, el) => {
            onAttributeAddeds.forEach((i) => i(el, attrs));
        });
        for (let node of removedNodes) {
            if (addedNodes.has(node))
                continue;
            onElRemoveds.forEach((i) => i(node));
            destroyTree(node);
        }
        addedNodes.forEach((node) => {
            node._x_ignoreSelf = true;
            node._x_ignore = true;
        });
        for (let node of addedNodes) {
            if (removedNodes.has(node))
                continue;
            if (!node.isConnected)
                continue;
            delete node._x_ignoreSelf;
            delete node._x_ignore;
            onElAddeds.forEach((i) => i(node));
            node._x_ignore = true;
            node._x_ignoreSelf = true;
        }
        addedNodes.forEach((node) => {
            delete node._x_ignoreSelf;
            delete node._x_ignore;
        });
        addedNodes = null;
        removedNodes = null;
        addedAttributes = null;
        removedAttributes = null;
    }
    function scope(node) {
        return mergeProxies(closestDataStack(node));
    }
    function addScopeToNode(node, data2, referenceNode) {
        node._x_dataStack = [data2, ...closestDataStack(referenceNode || node)];
        return () => {
            node._x_dataStack = node._x_dataStack.filter((i) => i !== data2);
        };
    }
    function closestDataStack(node) {
        if (node._x_dataStack)
            return node._x_dataStack;
        if (typeof ShadowRoot === "function" && node instanceof ShadowRoot) {
            return closestDataStack(node.host);
        }
        if (!node.parentNode) {
            return [];
        }
        return closestDataStack(node.parentNode);
    }
    function mergeProxies(objects) {
        return new Proxy({ objects }, mergeProxyTrap);
    }
    var mergeProxyTrap = {
        ownKeys({ objects }) {
            return Array.from(
                new Set(objects.flatMap((i) => Object.keys(i)))
            );
        },
        has({ objects }, name) {
            if (name == Symbol.unscopables)
                return false;
            return objects.some(
                (obj) => Object.prototype.hasOwnProperty.call(obj, name)
            );
        },
        get({ objects }, name, thisProxy) {
            if (name == "toJSON")
                return collapseProxies;
            return Reflect.get(
                objects.find(
                    (obj) => Object.prototype.hasOwnProperty.call(obj, name)
                ) || {},
                name,
                thisProxy
            );
        },
        set({ objects }, name, value, thisProxy) {
            const target = objects.find(
                (obj) => Object.prototype.hasOwnProperty.call(obj, name)
            ) || objects[objects.length - 1];
            const descriptor = Object.getOwnPropertyDescriptor(target, name);
            if (descriptor?.set && descriptor?.get)
                return Reflect.set(target, name, value, thisProxy);
            return Reflect.set(target, name, value);
        }
    };
    function collapseProxies() {
        let keys = Reflect.ownKeys(this);
        return keys.reduce((acc, key) => {
            acc[key] = Reflect.get(this, key);
            return acc;
        }, {});
    }
    function initInterceptors2(data2) {
        let isObject2 = (val) => typeof val === "object" && !Array.isArray(val) && val !== null;
        let recurse = (obj, basePath = "") => {
            Object.entries(Object.getOwnPropertyDescriptors(obj)).forEach(([key, { value, enumerable }]) => {
                if (enumerable === false || value === void 0)
                    return;
                let path = basePath === "" ? key : `${basePath}.${key}`;
                if (typeof value === "object" && value !== null && value._x_interceptor) {
                    obj[key] = value.initialize(data2, path, key);
                } else {
                    if (isObject2(value) && value !== obj && !(value instanceof Element)) {
                        recurse(value, path);
                    }
                }
            });
        };
        return recurse(data2);
    }
    function interceptor(callback, mutateObj = () => {
    }) {
        let obj = {
            initialValue: void 0,
            _x_interceptor: true,
            initialize(data2, path, key) {
                return callback(this.initialValue, () => get(data2, path), (value) => set(data2, path, value), path, key);
            }
        };
        mutateObj(obj);
        return (initialValue) => {
            if (typeof initialValue === "object" && initialValue !== null && initialValue._x_interceptor) {
                let initialize = obj.initialize.bind(obj);
                obj.initialize = (data2, path, key) => {
                    let innerValue = initialValue.initialize(data2, path, key);
                    obj.initialValue = innerValue;
                    return initialize(data2, path, key);
                };
            } else {
                obj.initialValue = initialValue;
            }
            return obj;
        };
    }
    function get(obj, path) {
        return path.split(".").reduce((carry, segment) => carry[segment], obj);
    }
    function set(obj, path, value) {
        if (typeof path === "string")
            path = path.split(".");
        if (path.length === 1)
            obj[path[0]] = value;
        else if (path.length === 0)
            throw error;
        else {
            if (obj[path[0]])
                return set(obj[path[0]], path.slice(1), value);
            else {
                obj[path[0]] = {};
                return set(obj[path[0]], path.slice(1), value);
            }
        }
    }
    var magics = {};
    function magic(name, callback) {
        magics[name] = callback;
    }
    function injectMagics(obj, el) {
        Object.entries(magics).forEach(([name, callback]) => {
            let memoizedUtilities = null;
            function getUtilities() {
                if (memoizedUtilities) {
                    return memoizedUtilities;
                } else {
                    let [utilities, cleanup2] = getElementBoundUtilities(el);
                    memoizedUtilities = { interceptor, ...utilities };
                    onElRemoved(el, cleanup2);
                    return memoizedUtilities;
                }
            }
            Object.defineProperty(obj, `$${name}`, {
                get() {
                    return callback(el, getUtilities());
                },
                enumerable: false
            });
        });
        return obj;
    }
    function tryCatch(el, expression, callback, ...args) {
        try {
            return callback(...args);
        } catch (e) {
            handleError(e, el, expression);
        }
    }
    function handleError(error2, el, expression = void 0) {
        error2 = Object.assign(
            error2 ?? { message: "No error message given." },
            { el, expression }
        );
        console.warn(`Alpine Expression Error: ${error2.message}

${expression ? 'Expression: "' + expression + '"\n\n' : ""}`, el);
        setTimeout(() => {
            throw error2;
        }, 0);
    }
    var shouldAutoEvaluateFunctions = true;
    function dontAutoEvaluateFunctions(callback) {
        let cache = shouldAutoEvaluateFunctions;
        shouldAutoEvaluateFunctions = false;
        let result = callback();
        shouldAutoEvaluateFunctions = cache;
        return result;
    }
    function evaluate(el, expression, extras = {}) {
        let result;
        evaluateLater(el, expression)((value) => result = value, extras);
        return result;
    }
    function evaluateLater(...args) {
        return theEvaluatorFunction(...args);
    }
    var theEvaluatorFunction = normalEvaluator;
    function setEvaluator(newEvaluator) {
        theEvaluatorFunction = newEvaluator;
    }
    function normalEvaluator(el, expression) {
        let overriddenMagics = {};
        injectMagics(overriddenMagics, el);
        let dataStack = [overriddenMagics, ...closestDataStack(el)];
        let evaluator = typeof expression === "function" ? generateEvaluatorFromFunction(dataStack, expression) : generateEvaluatorFromString(dataStack, expression, el);
        return tryCatch.bind(null, el, expression, evaluator);
    }
    function generateEvaluatorFromFunction(dataStack, func) {
        return (receiver = () => {
        }, { scope: scope2 = {}, params = [] } = {}) => {
            let result = func.apply(mergeProxies([scope2, ...dataStack]), params);
            runIfTypeOfFunction(receiver, result);
        };
    }
    var evaluatorMemo = {};
    function generateFunctionFromString(expression, el) {
        if (evaluatorMemo[expression]) {
            return evaluatorMemo[expression];
        }
        let AsyncFunction = Object.getPrototypeOf(async function() {
        }).constructor;
        let rightSideSafeExpression = /^[\n\s]*if.*\(.*\)/.test(expression.trim()) || /^(let|const)\s/.test(expression.trim()) ? `(async()=>{ ${expression} })()` : expression;
        const safeAsyncFunction = () => {
            try {
                let func2 = new AsyncFunction(
                    ["__self", "scope"],
                    `with (scope) { __self.result = ${rightSideSafeExpression} }; __self.finished = true; return __self.result;`
                );
                Object.defineProperty(func2, "name", {
                    value: `[Alpine] ${expression}`
                });
                return func2;
            } catch (error2) {
                handleError(error2, el, expression);
                return Promise.resolve();
            }
        };
        let func = safeAsyncFunction();
        evaluatorMemo[expression] = func;
        return func;
    }
    function generateEvaluatorFromString(dataStack, expression, el) {
        let func = generateFunctionFromString(expression, el);
        return (receiver = () => {
        }, { scope: scope2 = {}, params = [] } = {}) => {
            func.result = void 0;
            func.finished = false;
            let completeScope = mergeProxies([scope2, ...dataStack]);
            if (typeof func === "function") {
                let promise = func(func, completeScope).catch((error2) => handleError(error2, el, expression));
                if (func.finished) {
                    runIfTypeOfFunction(receiver, func.result, completeScope, params, el);
                    func.result = void 0;
                } else {
                    promise.then((result) => {
                        runIfTypeOfFunction(receiver, result, completeScope, params, el);
                    }).catch((error2) => handleError(error2, el, expression)).finally(() => func.result = void 0);
                }
            }
        };
    }
    function runIfTypeOfFunction(receiver, value, scope2, params, el) {
        if (shouldAutoEvaluateFunctions && typeof value === "function") {
            let result = value.apply(scope2, params);
            if (result instanceof Promise) {
                result.then((i) => runIfTypeOfFunction(receiver, i, scope2, params)).catch((error2) => handleError(error2, el, value));
            } else {
                receiver(result);
            }
        } else if (typeof value === "object" && value instanceof Promise) {
            value.then((i) => receiver(i));
        } else {
            receiver(value);
        }
    }
    var prefixAsString = "x-";
    function prefix(subject = "") {
        return prefixAsString + subject;
    }
    function setPrefix(newPrefix) {
        prefixAsString = newPrefix;
    }
    var directiveHandlers = {};
    function directive(name, callback) {
        directiveHandlers[name] = callback;
        return {
            before(directive2) {
                if (!directiveHandlers[directive2]) {
                    console.warn(String.raw`Cannot find directive \`${directive2}\`. \`${name}\` will use the default order of execution`);
                    return;
                }
                const pos = directiveOrder.indexOf(directive2);
                directiveOrder.splice(pos >= 0 ? pos : directiveOrder.indexOf("DEFAULT"), 0, name);
            }
        };
    }
    function directives(el, attributes, originalAttributeOverride) {
        attributes = Array.from(attributes);
        if (el._x_virtualDirectives) {
            let vAttributes = Object.entries(el._x_virtualDirectives).map(([name, value]) => ({ name, value }));
            let staticAttributes = attributesOnly(vAttributes);
            vAttributes = vAttributes.map((attribute) => {
                if (staticAttributes.find((attr) => attr.name === attribute.name)) {
                    return {
                        name: `x-bind:${attribute.name}`,
                        value: `"${attribute.value}"`
                    };
                }
                return attribute;
            });
            attributes = attributes.concat(vAttributes);
        }
        let transformedAttributeMap = {};
        let directives2 = attributes.map(toTransformedAttributes((newName, oldName) => transformedAttributeMap[newName] = oldName)).filter(outNonAlpineAttributes).map(toParsedDirectives(transformedAttributeMap, originalAttributeOverride)).sort(byPriority);
        return directives2.map((directive2) => {
            return getDirectiveHandler(el, directive2);
        });
    }
    function attributesOnly(attributes) {
        return Array.from(attributes).map(toTransformedAttributes()).filter((attr) => !outNonAlpineAttributes(attr));
    }
    var isDeferringHandlers = false;
    var directiveHandlerStacks = /* @__PURE__ */ new Map();
    var currentHandlerStackKey = Symbol();
    function deferHandlingDirectives(callback) {
        isDeferringHandlers = true;
        let key = Symbol();
        currentHandlerStackKey = key;
        directiveHandlerStacks.set(key, []);
        let flushHandlers = () => {
            while (directiveHandlerStacks.get(key).length)
                directiveHandlerStacks.get(key).shift()();
            directiveHandlerStacks.delete(key);
        };
        let stopDeferring = () => {
            isDeferringHandlers = false;
            flushHandlers();
        };
        callback(flushHandlers);
        stopDeferring();
    }
    function getElementBoundUtilities(el) {
        let cleanups = [];
        let cleanup2 = (callback) => cleanups.push(callback);
        let [effect32, cleanupEffect] = elementBoundEffect(el);
        cleanups.push(cleanupEffect);
        let utilities = {
            Alpine: alpine_default,
            effect: effect32,
            cleanup: cleanup2,
            evaluateLater: evaluateLater.bind(evaluateLater, el),
            evaluate: evaluate.bind(evaluate, el)
        };
        let doCleanup = () => cleanups.forEach((i) => i());
        return [utilities, doCleanup];
    }
    function getDirectiveHandler(el, directive2) {
        let noop = () => {
        };
        let handler4 = directiveHandlers[directive2.type] || noop;
        let [utilities, cleanup2] = getElementBoundUtilities(el);
        onAttributeRemoved(el, directive2.original, cleanup2);
        let fullHandler = () => {
            if (el._x_ignore || el._x_ignoreSelf)
                return;
            handler4.inline && handler4.inline(el, directive2, utilities);
            handler4 = handler4.bind(handler4, el, directive2, utilities);
            isDeferringHandlers ? directiveHandlerStacks.get(currentHandlerStackKey).push(handler4) : handler4();
        };
        fullHandler.runCleanups = cleanup2;
        return fullHandler;
    }
    var startingWith = (subject, replacement) => ({ name, value }) => {
        if (name.startsWith(subject))
            name = name.replace(subject, replacement);
        return { name, value };
    };
    var into = (i) => i;
    function toTransformedAttributes(callback = () => {
    }) {
        return ({ name, value }) => {
            let { name: newName, value: newValue } = attributeTransformers.reduce((carry, transform) => {
                return transform(carry);
            }, { name, value });
            if (newName !== name)
                callback(newName, name);
            return { name: newName, value: newValue };
        };
    }
    var attributeTransformers = [];
    function mapAttributes(callback) {
        attributeTransformers.push(callback);
    }
    function outNonAlpineAttributes({ name }) {
        return alpineAttributeRegex().test(name);
    }
    var alpineAttributeRegex = () => new RegExp(`^${prefixAsString}([^:^.]+)\\b`);
    function toParsedDirectives(transformedAttributeMap, originalAttributeOverride) {
        return ({ name, value }) => {
            let typeMatch = name.match(alpineAttributeRegex());
            let valueMatch = name.match(/:([a-zA-Z0-9\-_:]+)/);
            let modifiers = name.match(/\.[^.\]]+(?=[^\]]*$)/g) || [];
            let original = originalAttributeOverride || transformedAttributeMap[name] || name;
            return {
                type: typeMatch ? typeMatch[1] : null,
                value: valueMatch ? valueMatch[1] : null,
                modifiers: modifiers.map((i) => i.replace(".", "")),
                expression: value,
                original
            };
        };
    }
    var DEFAULT = "DEFAULT";
    var directiveOrder = [
        "ignore",
        "ref",
        "data",
        "id",
        "anchor",
        "bind",
        "init",
        "for",
        "model",
        "modelable",
        "transition",
        "show",
        "if",
        DEFAULT,
        "teleport"
    ];
    function byPriority(a, b) {
        let typeA = directiveOrder.indexOf(a.type) === -1 ? DEFAULT : a.type;
        let typeB = directiveOrder.indexOf(b.type) === -1 ? DEFAULT : b.type;
        return directiveOrder.indexOf(typeA) - directiveOrder.indexOf(typeB);
    }
    var tickStack = [];
    var isHolding = false;
    function nextTick(callback = () => {
    }) {
        queueMicrotask(() => {
            isHolding || setTimeout(() => {
                releaseNextTicks();
            });
        });
        return new Promise((res) => {
            tickStack.push(() => {
                callback();
                res();
            });
        });
    }
    function releaseNextTicks() {
        isHolding = false;
        while (tickStack.length)
            tickStack.shift()();
    }
    function holdNextTicks() {
        isHolding = true;
    }
    function setClasses(el, value) {
        if (Array.isArray(value)) {
            return setClassesFromString(el, value.join(" "));
        } else if (typeof value === "object" && value !== null) {
            return setClassesFromObject(el, value);
        } else if (typeof value === "function") {
            return setClasses(el, value());
        }
        return setClassesFromString(el, value);
    }
    function setClassesFromString(el, classString) {
        let split = (classString2) => classString2.split(" ").filter(Boolean);
        let missingClasses = (classString2) => classString2.split(" ").filter((i) => !el.classList.contains(i)).filter(Boolean);
        let addClassesAndReturnUndo = (classes) => {
            el.classList.add(...classes);
            return () => {
                el.classList.remove(...classes);
            };
        };
        classString = classString === true ? classString = "" : classString || "";
        return addClassesAndReturnUndo(missingClasses(classString));
    }
    function setClassesFromObject(el, classObject) {
        let split = (classString) => classString.split(" ").filter(Boolean);
        let forAdd = Object.entries(classObject).flatMap(([classString, bool]) => bool ? split(classString) : false).filter(Boolean);
        let forRemove = Object.entries(classObject).flatMap(([classString, bool]) => !bool ? split(classString) : false).filter(Boolean);
        let added = [];
        let removed = [];
        forRemove.forEach((i) => {
            if (el.classList.contains(i)) {
                el.classList.remove(i);
                removed.push(i);
            }
        });
        forAdd.forEach((i) => {
            if (!el.classList.contains(i)) {
                el.classList.add(i);
                added.push(i);
            }
        });
        return () => {
            removed.forEach((i) => el.classList.add(i));
            added.forEach((i) => el.classList.remove(i));
        };
    }
    function setStyles(el, value) {
        if (typeof value === "object" && value !== null) {
            return setStylesFromObject(el, value);
        }
        return setStylesFromString(el, value);
    }
    function setStylesFromObject(el, value) {
        let previousStyles = {};
        Object.entries(value).forEach(([key, value2]) => {
            previousStyles[key] = el.style[key];
            if (!key.startsWith("--")) {
                key = kebabCase(key);
            }
            el.style.setProperty(key, value2);
        });
        setTimeout(() => {
            if (el.style.length === 0) {
                el.removeAttribute("style");
            }
        });
        return () => {
            setStyles(el, previousStyles);
        };
    }
    function setStylesFromString(el, value) {
        let cache = el.getAttribute("style", value);
        el.setAttribute("style", value);
        return () => {
            el.setAttribute("style", cache || "");
        };
    }
    function kebabCase(subject) {
        return subject.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
    }
    function once(callback, fallback = () => {
    }) {
        let called = false;
        return function() {
            if (!called) {
                called = true;
                callback.apply(this, arguments);
            } else {
                fallback.apply(this, arguments);
            }
        };
    }
    directive("transition", (el, { value, modifiers, expression }, { evaluate: evaluate2 }) => {
        if (typeof expression === "function")
            expression = evaluate2(expression);
        if (expression === false)
            return;
        if (!expression || typeof expression === "boolean") {
            registerTransitionsFromHelper(el, modifiers, value);
        } else {
            registerTransitionsFromClassString(el, expression, value);
        }
    });
    function registerTransitionsFromClassString(el, classString, stage) {
        registerTransitionObject(el, setClasses, "");
        let directiveStorageMap = {
            "enter": (classes) => {
                el._x_transition.enter.during = classes;
            },
            "enter-start": (classes) => {
                el._x_transition.enter.start = classes;
            },
            "enter-end": (classes) => {
                el._x_transition.enter.end = classes;
            },
            "leave": (classes) => {
                el._x_transition.leave.during = classes;
            },
            "leave-start": (classes) => {
                el._x_transition.leave.start = classes;
            },
            "leave-end": (classes) => {
                el._x_transition.leave.end = classes;
            }
        };
        directiveStorageMap[stage](classString);
    }
    function registerTransitionsFromHelper(el, modifiers, stage) {
        registerTransitionObject(el, setStyles);
        let doesntSpecify = !modifiers.includes("in") && !modifiers.includes("out") && !stage;
        let transitioningIn = doesntSpecify || modifiers.includes("in") || ["enter"].includes(stage);
        let transitioningOut = doesntSpecify || modifiers.includes("out") || ["leave"].includes(stage);
        if (modifiers.includes("in") && !doesntSpecify) {
            modifiers = modifiers.filter((i, index) => index < modifiers.indexOf("out"));
        }
        if (modifiers.includes("out") && !doesntSpecify) {
            modifiers = modifiers.filter((i, index) => index > modifiers.indexOf("out"));
        }
        let wantsAll = !modifiers.includes("opacity") && !modifiers.includes("scale");
        let wantsOpacity = wantsAll || modifiers.includes("opacity");
        let wantsScale = wantsAll || modifiers.includes("scale");
        let opacityValue = wantsOpacity ? 0 : 1;
        let scaleValue = wantsScale ? modifierValue(modifiers, "scale", 95) / 100 : 1;
        let delay = modifierValue(modifiers, "delay", 0) / 1e3;
        let origin = modifierValue(modifiers, "origin", "center");
        let property = "opacity, transform";
        let durationIn = modifierValue(modifiers, "duration", 150) / 1e3;
        let durationOut = modifierValue(modifiers, "duration", 75) / 1e3;
        let easing = `cubic-bezier(0.4, 0.0, 0.2, 1)`;
        if (transitioningIn) {
            el._x_transition.enter.during = {
                transformOrigin: origin,
                transitionDelay: `${delay}s`,
                transitionProperty: property,
                transitionDuration: `${durationIn}s`,
                transitionTimingFunction: easing
            };
            el._x_transition.enter.start = {
                opacity: opacityValue,
                transform: `scale(${scaleValue})`
            };
            el._x_transition.enter.end = {
                opacity: 1,
                transform: `scale(1)`
            };
        }
        if (transitioningOut) {
            el._x_transition.leave.during = {
                transformOrigin: origin,
                transitionDelay: `${delay}s`,
                transitionProperty: property,
                transitionDuration: `${durationOut}s`,
                transitionTimingFunction: easing
            };
            el._x_transition.leave.start = {
                opacity: 1,
                transform: `scale(1)`
            };
            el._x_transition.leave.end = {
                opacity: opacityValue,
                transform: `scale(${scaleValue})`
            };
        }
    }
    function registerTransitionObject(el, setFunction, defaultValue = {}) {
        if (!el._x_transition)
            el._x_transition = {
                enter: { during: defaultValue, start: defaultValue, end: defaultValue },
                leave: { during: defaultValue, start: defaultValue, end: defaultValue },
                in(before = () => {
                }, after = () => {
                }) {
                    transition(el, setFunction, {
                        during: this.enter.during,
                        start: this.enter.start,
                        end: this.enter.end
                    }, before, after);
                },
                out(before = () => {
                }, after = () => {
                }) {
                    transition(el, setFunction, {
                        during: this.leave.during,
                        start: this.leave.start,
                        end: this.leave.end
                    }, before, after);
                }
            };
    }
    window.Element.prototype._x_toggleAndCascadeWithTransitions = function(el, value, show, hide2) {
        const nextTick2 = document.visibilityState === "visible" ? requestAnimationFrame : setTimeout;
        let clickAwayCompatibleShow = () => nextTick2(show);
        if (value) {
            if (el._x_transition && (el._x_transition.enter || el._x_transition.leave)) {
                el._x_transition.enter && (Object.entries(el._x_transition.enter.during).length || Object.entries(el._x_transition.enter.start).length || Object.entries(el._x_transition.enter.end).length) ? el._x_transition.in(show) : clickAwayCompatibleShow();
            } else {
                el._x_transition ? el._x_transition.in(show) : clickAwayCompatibleShow();
            }
            return;
        }
        el._x_hidePromise = el._x_transition ? new Promise((resolve, reject) => {
            el._x_transition.out(() => {
            }, () => resolve(hide2));
            el._x_transitioning && el._x_transitioning.beforeCancel(() => reject({ isFromCancelledTransition: true }));
        }) : Promise.resolve(hide2);
        queueMicrotask(() => {
            let closest = closestHide(el);
            if (closest) {
                if (!closest._x_hideChildren)
                    closest._x_hideChildren = [];
                closest._x_hideChildren.push(el);
            } else {
                nextTick2(() => {
                    let hideAfterChildren = (el2) => {
                        let carry = Promise.all([
                            el2._x_hidePromise,
                            ...(el2._x_hideChildren || []).map(hideAfterChildren)
                        ]).then(([i]) => i());
                        delete el2._x_hidePromise;
                        delete el2._x_hideChildren;
                        return carry;
                    };
                    hideAfterChildren(el).catch((e) => {
                        if (!e.isFromCancelledTransition)
                            throw e;
                    });
                });
            }
        });
    };
    function closestHide(el) {
        let parent = el.parentNode;
        if (!parent)
            return;
        return parent._x_hidePromise ? parent : closestHide(parent);
    }
    function transition(el, setFunction, { during, start: start22, end: end2 } = {}, before = () => {
    }, after = () => {
    }) {
        if (el._x_transitioning)
            el._x_transitioning.cancel();
        if (Object.keys(during).length === 0 && Object.keys(start22).length === 0 && Object.keys(end2).length === 0) {
            before();
            after();
            return;
        }
        let undoStart, undoDuring, undoEnd;
        performTransition(el, {
            start() {
                undoStart = setFunction(el, start22);
            },
            during() {
                undoDuring = setFunction(el, during);
            },
            before,
            end() {
                undoStart();
                undoEnd = setFunction(el, end2);
            },
            after,
            cleanup() {
                undoDuring();
                undoEnd();
            }
        });
    }
    function performTransition(el, stages) {
        let interrupted, reachedBefore, reachedEnd;
        let finish = once(() => {
            mutateDom(() => {
                interrupted = true;
                if (!reachedBefore)
                    stages.before();
                if (!reachedEnd) {
                    stages.end();
                    releaseNextTicks();
                }
                stages.after();
                if (el.isConnected)
                    stages.cleanup();
                delete el._x_transitioning;
            });
        });
        el._x_transitioning = {
            beforeCancels: [],
            beforeCancel(callback) {
                this.beforeCancels.push(callback);
            },
            cancel: once(function() {
                while (this.beforeCancels.length) {
                    this.beforeCancels.shift()();
                }
                ;
                finish();
            }),
            finish
        };
        mutateDom(() => {
            stages.start();
            stages.during();
        });
        holdNextTicks();
        requestAnimationFrame(() => {
            if (interrupted)
                return;
            let duration = Number(getComputedStyle(el).transitionDuration.replace(/,.*/, "").replace("s", "")) * 1e3;
            let delay = Number(getComputedStyle(el).transitionDelay.replace(/,.*/, "").replace("s", "")) * 1e3;
            if (duration === 0)
                duration = Number(getComputedStyle(el).animationDuration.replace("s", "")) * 1e3;
            mutateDom(() => {
                stages.before();
            });
            reachedBefore = true;
            requestAnimationFrame(() => {
                if (interrupted)
                    return;
                mutateDom(() => {
                    stages.end();
                });
                releaseNextTicks();
                setTimeout(el._x_transitioning.finish, duration + delay);
                reachedEnd = true;
            });
        });
    }
    function modifierValue(modifiers, key, fallback) {
        if (modifiers.indexOf(key) === -1)
            return fallback;
        const rawValue = modifiers[modifiers.indexOf(key) + 1];
        if (!rawValue)
            return fallback;
        if (key === "scale") {
            if (isNaN(rawValue))
                return fallback;
        }
        if (key === "duration" || key === "delay") {
            let match = rawValue.match(/([0-9]+)ms/);
            if (match)
                return match[1];
        }
        if (key === "origin") {
            if (["top", "right", "left", "center", "bottom"].includes(modifiers[modifiers.indexOf(key) + 2])) {
                return [rawValue, modifiers[modifiers.indexOf(key) + 2]].join(" ");
            }
        }
        return rawValue;
    }
    var isCloning = false;
    function skipDuringClone(callback, fallback = () => {
    }) {
        return (...args) => isCloning ? fallback(...args) : callback(...args);
    }
    function onlyDuringClone(callback) {
        return (...args) => isCloning && callback(...args);
    }
    var interceptors = [];
    function interceptClone(callback) {
        interceptors.push(callback);
    }
    function cloneNode(from, to) {
        interceptors.forEach((i) => i(from, to));
        isCloning = true;
        dontRegisterReactiveSideEffects(() => {
            initTree(to, (el, callback) => {
                callback(el, () => {
                });
            });
        });
        isCloning = false;
    }
    var isCloningLegacy = false;
    function clone(oldEl, newEl) {
        if (!newEl._x_dataStack)
            newEl._x_dataStack = oldEl._x_dataStack;
        isCloning = true;
        isCloningLegacy = true;
        dontRegisterReactiveSideEffects(() => {
            cloneTree(newEl);
        });
        isCloning = false;
        isCloningLegacy = false;
    }
    function cloneTree(el) {
        let hasRunThroughFirstEl = false;
        let shallowWalker = (el2, callback) => {
            walk(el2, (el3, skip) => {
                if (hasRunThroughFirstEl && isRoot(el3))
                    return skip();
                hasRunThroughFirstEl = true;
                callback(el3, skip);
            });
        };
        initTree(el, shallowWalker);
    }
    function dontRegisterReactiveSideEffects(callback) {
        let cache = effect;
        overrideEffect((callback2, el) => {
            let storedEffect = cache(callback2);
            release(storedEffect);
            return () => {
            };
        });
        callback();
        overrideEffect(cache);
    }
    function bind(el, name, value, modifiers = []) {
        if (!el._x_bindings)
            el._x_bindings = reactive({});
        el._x_bindings[name] = value;
        name = modifiers.includes("camel") ? camelCase(name) : name;
        switch (name) {
            case "value":
                bindInputValue(el, value);
                break;
            case "style":
                bindStyles(el, value);
                break;
            case "class":
                bindClasses(el, value);
                break;
            case "selected":
            case "checked":
                bindAttributeAndProperty(el, name, value);
                break;
            default:
                bindAttribute(el, name, value);
                break;
        }
    }
    function bindInputValue(el, value) {
        if (el.type === "radio") {
            if (el.attributes.value === void 0) {
                el.value = value;
            }
            if (window.fromModel) {
                if (typeof value === "boolean") {
                    el.checked = safeParseBoolean(el.value) === value;
                } else {
                    el.checked = checkedAttrLooseCompare(el.value, value);
                }
            }
        } else if (el.type === "checkbox") {
            if (Number.isInteger(value)) {
                el.value = value;
            } else if (!Array.isArray(value) && typeof value !== "boolean" && ![null, void 0].includes(value)) {
                el.value = String(value);
            } else {
                if (Array.isArray(value)) {
                    el.checked = value.some((val) => checkedAttrLooseCompare(val, el.value));
                } else {
                    el.checked = !!value;
                }
            }
        } else if (el.tagName === "SELECT") {
            updateSelect(el, value);
        } else {
            if (el.value === value)
                return;
            el.value = value === void 0 ? "" : value;
        }
    }
    function bindClasses(el, value) {
        if (el._x_undoAddedClasses)
            el._x_undoAddedClasses();
        el._x_undoAddedClasses = setClasses(el, value);
    }
    function bindStyles(el, value) {
        if (el._x_undoAddedStyles)
            el._x_undoAddedStyles();
        el._x_undoAddedStyles = setStyles(el, value);
    }
    function bindAttributeAndProperty(el, name, value) {
        bindAttribute(el, name, value);
        setPropertyIfChanged(el, name, value);
    }
    function bindAttribute(el, name, value) {
        if ([null, void 0, false].includes(value) && attributeShouldntBePreservedIfFalsy(name)) {
            el.removeAttribute(name);
        } else {
            if (isBooleanAttr(name))
                value = name;
            setIfChanged(el, name, value);
        }
    }
    function setIfChanged(el, attrName, value) {
        if (el.getAttribute(attrName) != value) {
            el.setAttribute(attrName, value);
        }
    }
    function setPropertyIfChanged(el, propName, value) {
        if (el[propName] !== value) {
            el[propName] = value;
        }
    }
    function updateSelect(el, value) {
        const arrayWrappedValue = [].concat(value).map((value2) => {
            return value2 + "";
        });
        Array.from(el.options).forEach((option) => {
            option.selected = arrayWrappedValue.includes(option.value);
        });
    }
    function camelCase(subject) {
        return subject.toLowerCase().replace(/-(\w)/g, (match, char) => char.toUpperCase());
    }
    function checkedAttrLooseCompare(valueA, valueB) {
        return valueA == valueB;
    }
    function safeParseBoolean(rawValue) {
        if ([1, "1", "true", "on", "yes", true].includes(rawValue)) {
            return true;
        }
        if ([0, "0", "false", "off", "no", false].includes(rawValue)) {
            return false;
        }
        return rawValue ? Boolean(rawValue) : null;
    }
    function isBooleanAttr(attrName) {
        const booleanAttributes = [
            "disabled",
            "checked",
            "required",
            "readonly",
            "hidden",
            "open",
            "selected",
            "autofocus",
            "itemscope",
            "multiple",
            "novalidate",
            "allowfullscreen",
            "allowpaymentrequest",
            "formnovalidate",
            "autoplay",
            "controls",
            "loop",
            "muted",
            "playsinline",
            "default",
            "ismap",
            "reversed",
            "async",
            "defer",
            "nomodule"
        ];
        return booleanAttributes.includes(attrName);
    }
    function attributeShouldntBePreservedIfFalsy(name) {
        return !["aria-pressed", "aria-checked", "aria-expanded", "aria-selected"].includes(name);
    }
    function getBinding(el, name, fallback) {
        if (el._x_bindings && el._x_bindings[name] !== void 0)
            return el._x_bindings[name];
        return getAttributeBinding(el, name, fallback);
    }
    function extractProp(el, name, fallback, extract = true) {
        if (el._x_bindings && el._x_bindings[name] !== void 0)
            return el._x_bindings[name];
        if (el._x_inlineBindings && el._x_inlineBindings[name] !== void 0) {
            let binding = el._x_inlineBindings[name];
            binding.extract = extract;
            return dontAutoEvaluateFunctions(() => {
                return evaluate(el, binding.expression);
            });
        }
        return getAttributeBinding(el, name, fallback);
    }
    function getAttributeBinding(el, name, fallback) {
        let attr = el.getAttribute(name);
        if (attr === null)
            return typeof fallback === "function" ? fallback() : fallback;
        if (attr === "")
            return true;
        if (isBooleanAttr(name)) {
            return !![name, "true"].includes(attr);
        }
        return attr;
    }
    function debounce(func, wait) {
        var timeout;
        return function() {
            var context = this, args = arguments;
            var later = function() {
                timeout = null;
                func.apply(context, args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    function throttle(func, limit) {
        let inThrottle;
        return function() {
            let context = this, args = arguments;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
    function entangle({ get: outerGet, set: outerSet }, { get: innerGet, set: innerSet }) {
        let firstRun = true;
        let outerHash;
        let innerHash;
        let reference2 = effect(() => {
            let outer = outerGet();
            let inner = innerGet();
            if (firstRun) {
                innerSet(cloneIfObject(outer));
                firstRun = false;
            } else {
                let outerHashLatest = JSON.stringify(outer);
                let innerHashLatest = JSON.stringify(inner);
                if (outerHashLatest !== outerHash) {
                    innerSet(cloneIfObject(outer));
                } else if (outerHashLatest !== innerHashLatest) {
                    outerSet(cloneIfObject(inner));
                } else {
                }
            }
            outerHash = JSON.stringify(outerGet());
            innerHash = JSON.stringify(innerGet());
        });
        return () => {
            release(reference2);
        };
    }
    function cloneIfObject(value) {
        return typeof value === "object" ? JSON.parse(JSON.stringify(value)) : value;
    }
    function plugin(callback) {
        let callbacks = Array.isArray(callback) ? callback : [callback];
        callbacks.forEach((i) => i(alpine_default));
    }
    var stores = {};
    var isReactive = false;
    function store(name, value) {
        if (!isReactive) {
            stores = reactive(stores);
            isReactive = true;
        }
        if (value === void 0) {
            return stores[name];
        }
        stores[name] = value;
        if (typeof value === "object" && value !== null && value.hasOwnProperty("init") && typeof value.init === "function") {
            stores[name].init();
        }
        initInterceptors2(stores[name]);
    }
    function getStores() {
        return stores;
    }
    var binds = {};
    function bind2(name, bindings) {
        let getBindings = typeof bindings !== "function" ? () => bindings : bindings;
        if (name instanceof Element) {
            return applyBindingsObject(name, getBindings());
        } else {
            binds[name] = getBindings;
        }
        return () => {
        };
    }
    function injectBindingProviders(obj) {
        Object.entries(binds).forEach(([name, callback]) => {
            Object.defineProperty(obj, name, {
                get() {
                    return (...args) => {
                        return callback(...args);
                    };
                }
            });
        });
        return obj;
    }
    function applyBindingsObject(el, obj, original) {
        let cleanupRunners = [];
        while (cleanupRunners.length)
            cleanupRunners.pop()();
        let attributes = Object.entries(obj).map(([name, value]) => ({ name, value }));
        let staticAttributes = attributesOnly(attributes);
        attributes = attributes.map((attribute) => {
            if (staticAttributes.find((attr) => attr.name === attribute.name)) {
                return {
                    name: `x-bind:${attribute.name}`,
                    value: `"${attribute.value}"`
                };
            }
            return attribute;
        });
        directives(el, attributes, original).map((handle) => {
            cleanupRunners.push(handle.runCleanups);
            handle();
        });
        return () => {
            while (cleanupRunners.length)
                cleanupRunners.pop()();
        };
    }
    var datas = {};
    function data(name, callback) {
        datas[name] = callback;
    }
    function injectDataProviders(obj, context) {
        Object.entries(datas).forEach(([name, callback]) => {
            Object.defineProperty(obj, name, {
                get() {
                    return (...args) => {
                        return callback.bind(context)(...args);
                    };
                },
                enumerable: false
            });
        });
        return obj;
    }
    var Alpine = {
        get reactive() {
            return reactive;
        },
        get release() {
            return release;
        },
        get effect() {
            return effect;
        },
        get raw() {
            return raw;
        },
        version: "3.13.5",
        flushAndStopDeferringMutations,
        dontAutoEvaluateFunctions,
        disableEffectScheduling,
        startObservingMutations,
        stopObservingMutations,
        setReactivityEngine,
        onAttributeRemoved,
        onAttributesAdded,
        closestDataStack,
        skipDuringClone,
        onlyDuringClone,
        addRootSelector,
        addInitSelector,
        interceptClone,
        addScopeToNode,
        deferMutations,
        mapAttributes,
        evaluateLater,
        interceptInit,
        setEvaluator,
        mergeProxies,
        extractProp,
        findClosest,
        onElRemoved,
        closestRoot,
        destroyTree,
        interceptor,
        // INTERNAL: not public API and is subject to change without major release.
        transition,
        // INTERNAL
        setStyles,
        // INTERNAL
        mutateDom,
        directive,
        entangle,
        throttle,
        debounce,
        evaluate,
        initTree,
        nextTick,
        prefixed: prefix,
        prefix: setPrefix,
        plugin,
        magic,
        store,
        start,
        clone,
        // INTERNAL
        cloneNode,
        // INTERNAL
        bound: getBinding,
        $data: scope,
        watch,
        walk,
        data,
        bind: bind2
    };
    var alpine_default = Alpine;
    function makeMap(str, expectsLowerCase) {
        const map = /* @__PURE__ */ Object.create(null);
        const list = str.split(",");
        for (let i = 0; i < list.length; i++) {
            map[list[i]] = true;
        }
        return expectsLowerCase ? (val) => !!map[val.toLowerCase()] : (val) => !!map[val];
    }
    var specialBooleanAttrs = `itemscope,allowfullscreen,formnovalidate,ismap,nomodule,novalidate,readonly`;
    var isBooleanAttr2 = /* @__PURE__ */ makeMap(specialBooleanAttrs + `,async,autofocus,autoplay,controls,default,defer,disabled,hidden,loop,open,required,reversed,scoped,seamless,checked,muted,multiple,selected`);
    var EMPTY_OBJ = true ? Object.freeze({}) : {};
    var EMPTY_ARR = true ? Object.freeze([]) : [];
    var hasOwnProperty = Object.prototype.hasOwnProperty;
    var hasOwn = (val, key) => hasOwnProperty.call(val, key);
    var isArray = Array.isArray;
    var isMap = (val) => toTypeString(val) === "[object Map]";
    var isString = (val) => typeof val === "string";
    var isSymbol = (val) => typeof val === "symbol";
    var isObject = (val) => val !== null && typeof val === "object";
    var objectToString = Object.prototype.toString;
    var toTypeString = (value) => objectToString.call(value);
    var toRawType = (value) => {
        return toTypeString(value).slice(8, -1);
    };
    var isIntegerKey = (key) => isString(key) && key !== "NaN" && key[0] !== "-" && "" + parseInt(key, 10) === key;
    var cacheStringFunction = (fn2) => {
        const cache = /* @__PURE__ */ Object.create(null);
        return (str) => {
            const hit = cache[str];
            return hit || (cache[str] = fn2(str));
        };
    };
    var camelizeRE = /-(\w)/g;
    var camelize = cacheStringFunction((str) => {
        return str.replace(camelizeRE, (_, c) => c ? c.toUpperCase() : "");
    });
    var hyphenateRE = /\B([A-Z])/g;
    var hyphenate = cacheStringFunction((str) => str.replace(hyphenateRE, "-$1").toLowerCase());
    var capitalize = cacheStringFunction((str) => str.charAt(0).toUpperCase() + str.slice(1));
    var toHandlerKey = cacheStringFunction((str) => str ? `on${capitalize(str)}` : ``);
    var hasChanged = (value, oldValue) => value !== oldValue && (value === value || oldValue === oldValue);
    var targetMap = /* @__PURE__ */ new WeakMap();
    var effectStack = [];
    var activeEffect;
    var ITERATE_KEY = Symbol(true ? "iterate" : "");
    var MAP_KEY_ITERATE_KEY = Symbol(true ? "Map key iterate" : "");
    function isEffect(fn2) {
        return fn2 && fn2._isEffect === true;
    }
    function effect2(fn2, options = EMPTY_OBJ) {
        if (isEffect(fn2)) {
            fn2 = fn2.raw;
        }
        const effect32 = createReactiveEffect(fn2, options);
        if (!options.lazy) {
            effect32();
        }
        return effect32;
    }
    function stop(effect32) {
        if (effect32.active) {
            cleanup(effect32);
            if (effect32.options.onStop) {
                effect32.options.onStop();
            }
            effect32.active = false;
        }
    }
    var uid = 0;
    function createReactiveEffect(fn2, options) {
        const effect32 = function reactiveEffect() {
            if (!effect32.active) {
                return fn2();
            }
            if (!effectStack.includes(effect32)) {
                cleanup(effect32);
                try {
                    enableTracking();
                    effectStack.push(effect32);
                    activeEffect = effect32;
                    return fn2();
                } finally {
                    effectStack.pop();
                    resetTracking();
                    activeEffect = effectStack[effectStack.length - 1];
                }
            }
        };
        effect32.id = uid++;
        effect32.allowRecurse = !!options.allowRecurse;
        effect32._isEffect = true;
        effect32.active = true;
        effect32.raw = fn2;
        effect32.deps = [];
        effect32.options = options;
        return effect32;
    }
    function cleanup(effect32) {
        const { deps } = effect32;
        if (deps.length) {
            for (let i = 0; i < deps.length; i++) {
                deps[i].delete(effect32);
            }
            deps.length = 0;
        }
    }
    var shouldTrack = true;
    var trackStack = [];
    function pauseTracking() {
        trackStack.push(shouldTrack);
        shouldTrack = false;
    }
    function enableTracking() {
        trackStack.push(shouldTrack);
        shouldTrack = true;
    }
    function resetTracking() {
        const last = trackStack.pop();
        shouldTrack = last === void 0 ? true : last;
    }
    function track(target, type, key) {
        if (!shouldTrack || activeEffect === void 0) {
            return;
        }
        let depsMap = targetMap.get(target);
        if (!depsMap) {
            targetMap.set(target, depsMap = /* @__PURE__ */ new Map());
        }
        let dep = depsMap.get(key);
        if (!dep) {
            depsMap.set(key, dep = /* @__PURE__ */ new Set());
        }
        if (!dep.has(activeEffect)) {
            dep.add(activeEffect);
            activeEffect.deps.push(dep);
            if (activeEffect.options.onTrack) {
                activeEffect.options.onTrack({
                    effect: activeEffect,
                    target,
                    type,
                    key
                });
            }
        }
    }
    function trigger(target, type, key, newValue, oldValue, oldTarget) {
        const depsMap = targetMap.get(target);
        if (!depsMap) {
            return;
        }
        const effects = /* @__PURE__ */ new Set();
        const add2 = (effectsToAdd) => {
            if (effectsToAdd) {
                effectsToAdd.forEach((effect32) => {
                    if (effect32 !== activeEffect || effect32.allowRecurse) {
                        effects.add(effect32);
                    }
                });
            }
        };
        if (type === "clear") {
            depsMap.forEach(add2);
        } else if (key === "length" && isArray(target)) {
            depsMap.forEach((dep, key2) => {
                if (key2 === "length" || key2 >= newValue) {
                    add2(dep);
                }
            });
        } else {
            if (key !== void 0) {
                add2(depsMap.get(key));
            }
            switch (type) {
                case "add":
                    if (!isArray(target)) {
                        add2(depsMap.get(ITERATE_KEY));
                        if (isMap(target)) {
                            add2(depsMap.get(MAP_KEY_ITERATE_KEY));
                        }
                    } else if (isIntegerKey(key)) {
                        add2(depsMap.get("length"));
                    }
                    break;
                case "delete":
                    if (!isArray(target)) {
                        add2(depsMap.get(ITERATE_KEY));
                        if (isMap(target)) {
                            add2(depsMap.get(MAP_KEY_ITERATE_KEY));
                        }
                    }
                    break;
                case "set":
                    if (isMap(target)) {
                        add2(depsMap.get(ITERATE_KEY));
                    }
                    break;
            }
        }
        const run = (effect32) => {
            if (effect32.options.onTrigger) {
                effect32.options.onTrigger({
                    effect: effect32,
                    target,
                    key,
                    type,
                    newValue,
                    oldValue,
                    oldTarget
                });
            }
            if (effect32.options.scheduler) {
                effect32.options.scheduler(effect32);
            } else {
                effect32();
            }
        };
        effects.forEach(run);
    }
    var isNonTrackableKeys = /* @__PURE__ */ makeMap(`__proto__,__v_isRef,__isVue`);
    var builtInSymbols = new Set(Object.getOwnPropertyNames(Symbol).map((key) => Symbol[key]).filter(isSymbol));
    var get2 = /* @__PURE__ */ createGetter();
    var readonlyGet = /* @__PURE__ */ createGetter(true);
    var arrayInstrumentations = /* @__PURE__ */ createArrayInstrumentations();
    function createArrayInstrumentations() {
        const instrumentations = {};
        ["includes", "indexOf", "lastIndexOf"].forEach((key) => {
            instrumentations[key] = function(...args) {
                const arr = toRaw(this);
                for (let i = 0, l = this.length; i < l; i++) {
                    track(arr, "get", i + "");
                }
                const res = arr[key](...args);
                if (res === -1 || res === false) {
                    return arr[key](...args.map(toRaw));
                } else {
                    return res;
                }
            };
        });
        ["push", "pop", "shift", "unshift", "splice"].forEach((key) => {
            instrumentations[key] = function(...args) {
                pauseTracking();
                const res = toRaw(this)[key].apply(this, args);
                resetTracking();
                return res;
            };
        });
        return instrumentations;
    }
    function createGetter(isReadonly = false, shallow = false) {
        return function get3(target, key, receiver) {
            if (key === "__v_isReactive") {
                return !isReadonly;
            } else if (key === "__v_isReadonly") {
                return isReadonly;
            } else if (key === "__v_raw" && receiver === (isReadonly ? shallow ? shallowReadonlyMap : readonlyMap : shallow ? shallowReactiveMap : reactiveMap).get(target)) {
                return target;
            }
            const targetIsArray = isArray(target);
            if (!isReadonly && targetIsArray && hasOwn(arrayInstrumentations, key)) {
                return Reflect.get(arrayInstrumentations, key, receiver);
            }
            const res = Reflect.get(target, key, receiver);
            if (isSymbol(key) ? builtInSymbols.has(key) : isNonTrackableKeys(key)) {
                return res;
            }
            if (!isReadonly) {
                track(target, "get", key);
            }
            if (shallow) {
                return res;
            }
            if (isRef(res)) {
                const shouldUnwrap = !targetIsArray || !isIntegerKey(key);
                return shouldUnwrap ? res.value : res;
            }
            if (isObject(res)) {
                return isReadonly ? readonly(res) : reactive2(res);
            }
            return res;
        };
    }
    var set2 = /* @__PURE__ */ createSetter();
    function createSetter(shallow = false) {
        return function set3(target, key, value, receiver) {
            let oldValue = target[key];
            if (!shallow) {
                value = toRaw(value);
                oldValue = toRaw(oldValue);
                if (!isArray(target) && isRef(oldValue) && !isRef(value)) {
                    oldValue.value = value;
                    return true;
                }
            }
            const hadKey = isArray(target) && isIntegerKey(key) ? Number(key) < target.length : hasOwn(target, key);
            const result = Reflect.set(target, key, value, receiver);
            if (target === toRaw(receiver)) {
                if (!hadKey) {
                    trigger(target, "add", key, value);
                } else if (hasChanged(value, oldValue)) {
                    trigger(target, "set", key, value, oldValue);
                }
            }
            return result;
        };
    }
    function deleteProperty(target, key) {
        const hadKey = hasOwn(target, key);
        const oldValue = target[key];
        const result = Reflect.deleteProperty(target, key);
        if (result && hadKey) {
            trigger(target, "delete", key, void 0, oldValue);
        }
        return result;
    }
    function has(target, key) {
        const result = Reflect.has(target, key);
        if (!isSymbol(key) || !builtInSymbols.has(key)) {
            track(target, "has", key);
        }
        return result;
    }
    function ownKeys(target) {
        track(target, "iterate", isArray(target) ? "length" : ITERATE_KEY);
        return Reflect.ownKeys(target);
    }
    var mutableHandlers = {
        get: get2,
        set: set2,
        deleteProperty,
        has,
        ownKeys
    };
    var readonlyHandlers = {
        get: readonlyGet,
        set(target, key) {
            if (true) {
                console.warn(`Set operation on key "${String(key)}" failed: target is readonly.`, target);
            }
            return true;
        },
        deleteProperty(target, key) {
            if (true) {
                console.warn(`Delete operation on key "${String(key)}" failed: target is readonly.`, target);
            }
            return true;
        }
    };
    var toReactive = (value) => isObject(value) ? reactive2(value) : value;
    var toReadonly = (value) => isObject(value) ? readonly(value) : value;
    var toShallow = (value) => value;
    var getProto = (v) => Reflect.getPrototypeOf(v);
    function get$1(target, key, isReadonly = false, isShallow = false) {
        target = target[
            "__v_raw"
            /* RAW */
            ];
        const rawTarget = toRaw(target);
        const rawKey = toRaw(key);
        if (key !== rawKey) {
            !isReadonly && track(rawTarget, "get", key);
        }
        !isReadonly && track(rawTarget, "get", rawKey);
        const { has: has2 } = getProto(rawTarget);
        const wrap = isShallow ? toShallow : isReadonly ? toReadonly : toReactive;
        if (has2.call(rawTarget, key)) {
            return wrap(target.get(key));
        } else if (has2.call(rawTarget, rawKey)) {
            return wrap(target.get(rawKey));
        } else if (target !== rawTarget) {
            target.get(key);
        }
    }
    function has$1(key, isReadonly = false) {
        const target = this[
            "__v_raw"
            /* RAW */
            ];
        const rawTarget = toRaw(target);
        const rawKey = toRaw(key);
        if (key !== rawKey) {
            !isReadonly && track(rawTarget, "has", key);
        }
        !isReadonly && track(rawTarget, "has", rawKey);
        return key === rawKey ? target.has(key) : target.has(key) || target.has(rawKey);
    }
    function size(target, isReadonly = false) {
        target = target[
            "__v_raw"
            /* RAW */
            ];
        !isReadonly && track(toRaw(target), "iterate", ITERATE_KEY);
        return Reflect.get(target, "size", target);
    }
    function add(value) {
        value = toRaw(value);
        const target = toRaw(this);
        const proto = getProto(target);
        const hadKey = proto.has.call(target, value);
        if (!hadKey) {
            target.add(value);
            trigger(target, "add", value, value);
        }
        return this;
    }
    function set$1(key, value) {
        value = toRaw(value);
        const target = toRaw(this);
        const { has: has2, get: get3 } = getProto(target);
        let hadKey = has2.call(target, key);
        if (!hadKey) {
            key = toRaw(key);
            hadKey = has2.call(target, key);
        } else if (true) {
            checkIdentityKeys(target, has2, key);
        }
        const oldValue = get3.call(target, key);
        target.set(key, value);
        if (!hadKey) {
            trigger(target, "add", key, value);
        } else if (hasChanged(value, oldValue)) {
            trigger(target, "set", key, value, oldValue);
        }
        return this;
    }
    function deleteEntry(key) {
        const target = toRaw(this);
        const { has: has2, get: get3 } = getProto(target);
        let hadKey = has2.call(target, key);
        if (!hadKey) {
            key = toRaw(key);
            hadKey = has2.call(target, key);
        } else if (true) {
            checkIdentityKeys(target, has2, key);
        }
        const oldValue = get3 ? get3.call(target, key) : void 0;
        const result = target.delete(key);
        if (hadKey) {
            trigger(target, "delete", key, void 0, oldValue);
        }
        return result;
    }
    function clear() {
        const target = toRaw(this);
        const hadItems = target.size !== 0;
        const oldTarget = true ? isMap(target) ? new Map(target) : new Set(target) : void 0;
        const result = target.clear();
        if (hadItems) {
            trigger(target, "clear", void 0, void 0, oldTarget);
        }
        return result;
    }
    function createForEach(isReadonly, isShallow) {
        return function forEach(callback, thisArg) {
            const observed = this;
            const target = observed[
                "__v_raw"
                /* RAW */
                ];
            const rawTarget = toRaw(target);
            const wrap = isShallow ? toShallow : isReadonly ? toReadonly : toReactive;
            !isReadonly && track(rawTarget, "iterate", ITERATE_KEY);
            return target.forEach((value, key) => {
                return callback.call(thisArg, wrap(value), wrap(key), observed);
            });
        };
    }
    function createIterableMethod(method, isReadonly, isShallow) {
        return function(...args) {
            const target = this[
                "__v_raw"
                /* RAW */
                ];
            const rawTarget = toRaw(target);
            const targetIsMap = isMap(rawTarget);
            const isPair = method === "entries" || method === Symbol.iterator && targetIsMap;
            const isKeyOnly = method === "keys" && targetIsMap;
            const innerIterator = target[method](...args);
            const wrap = isShallow ? toShallow : isReadonly ? toReadonly : toReactive;
            !isReadonly && track(rawTarget, "iterate", isKeyOnly ? MAP_KEY_ITERATE_KEY : ITERATE_KEY);
            return {
                // iterator protocol
                next() {
                    const { value, done } = innerIterator.next();
                    return done ? { value, done } : {
                        value: isPair ? [wrap(value[0]), wrap(value[1])] : wrap(value),
                        done
                    };
                },
                // iterable protocol
                [Symbol.iterator]() {
                    return this;
                }
            };
        };
    }
    function createReadonlyMethod(type) {
        return function(...args) {
            if (true) {
                const key = args[0] ? `on key "${args[0]}" ` : ``;
                console.warn(`${capitalize(type)} operation ${key}failed: target is readonly.`, toRaw(this));
            }
            return type === "delete" ? false : this;
        };
    }
    function createInstrumentations() {
        const mutableInstrumentations2 = {
            get(key) {
                return get$1(this, key);
            },
            get size() {
                return size(this);
            },
            has: has$1,
            add,
            set: set$1,
            delete: deleteEntry,
            clear,
            forEach: createForEach(false, false)
        };
        const shallowInstrumentations2 = {
            get(key) {
                return get$1(this, key, false, true);
            },
            get size() {
                return size(this);
            },
            has: has$1,
            add,
            set: set$1,
            delete: deleteEntry,
            clear,
            forEach: createForEach(false, true)
        };
        const readonlyInstrumentations2 = {
            get(key) {
                return get$1(this, key, true);
            },
            get size() {
                return size(this, true);
            },
            has(key) {
                return has$1.call(this, key, true);
            },
            add: createReadonlyMethod(
                "add"
                /* ADD */
            ),
            set: createReadonlyMethod(
                "set"
                /* SET */
            ),
            delete: createReadonlyMethod(
                "delete"
                /* DELETE */
            ),
            clear: createReadonlyMethod(
                "clear"
                /* CLEAR */
            ),
            forEach: createForEach(true, false)
        };
        const shallowReadonlyInstrumentations2 = {
            get(key) {
                return get$1(this, key, true, true);
            },
            get size() {
                return size(this, true);
            },
            has(key) {
                return has$1.call(this, key, true);
            },
            add: createReadonlyMethod(
                "add"
                /* ADD */
            ),
            set: createReadonlyMethod(
                "set"
                /* SET */
            ),
            delete: createReadonlyMethod(
                "delete"
                /* DELETE */
            ),
            clear: createReadonlyMethod(
                "clear"
                /* CLEAR */
            ),
            forEach: createForEach(true, true)
        };
        const iteratorMethods = ["keys", "values", "entries", Symbol.iterator];
        iteratorMethods.forEach((method) => {
            mutableInstrumentations2[method] = createIterableMethod(method, false, false);
            readonlyInstrumentations2[method] = createIterableMethod(method, true, false);
            shallowInstrumentations2[method] = createIterableMethod(method, false, true);
            shallowReadonlyInstrumentations2[method] = createIterableMethod(method, true, true);
        });
        return [
            mutableInstrumentations2,
            readonlyInstrumentations2,
            shallowInstrumentations2,
            shallowReadonlyInstrumentations2
        ];
    }
    var [mutableInstrumentations, readonlyInstrumentations, shallowInstrumentations, shallowReadonlyInstrumentations] = /* @__PURE__ */ createInstrumentations();
    function createInstrumentationGetter(isReadonly, shallow) {
        const instrumentations = shallow ? isReadonly ? shallowReadonlyInstrumentations : shallowInstrumentations : isReadonly ? readonlyInstrumentations : mutableInstrumentations;
        return (target, key, receiver) => {
            if (key === "__v_isReactive") {
                return !isReadonly;
            } else if (key === "__v_isReadonly") {
                return isReadonly;
            } else if (key === "__v_raw") {
                return target;
            }
            return Reflect.get(hasOwn(instrumentations, key) && key in target ? instrumentations : target, key, receiver);
        };
    }
    var mutableCollectionHandlers = {
        get: /* @__PURE__ */ createInstrumentationGetter(false, false)
    };
    var readonlyCollectionHandlers = {
        get: /* @__PURE__ */ createInstrumentationGetter(true, false)
    };
    function checkIdentityKeys(target, has2, key) {
        const rawKey = toRaw(key);
        if (rawKey !== key && has2.call(target, rawKey)) {
            const type = toRawType(target);
            console.warn(`Reactive ${type} contains both the raw and reactive versions of the same object${type === `Map` ? ` as keys` : ``}, which can lead to inconsistencies. Avoid differentiating between the raw and reactive versions of an object and only use the reactive version if possible.`);
        }
    }
    var reactiveMap = /* @__PURE__ */ new WeakMap();
    var shallowReactiveMap = /* @__PURE__ */ new WeakMap();
    var readonlyMap = /* @__PURE__ */ new WeakMap();
    var shallowReadonlyMap = /* @__PURE__ */ new WeakMap();
    function targetTypeMap(rawType) {
        switch (rawType) {
            case "Object":
            case "Array":
                return 1;
            case "Map":
            case "Set":
            case "WeakMap":
            case "WeakSet":
                return 2;
            default:
                return 0;
        }
    }
    function getTargetType(value) {
        return value[
            "__v_skip"
            /* SKIP */
            ] || !Object.isExtensible(value) ? 0 : targetTypeMap(toRawType(value));
    }
    function reactive2(target) {
        if (target && target[
            "__v_isReadonly"
            /* IS_READONLY */
            ]) {
            return target;
        }
        return createReactiveObject(target, false, mutableHandlers, mutableCollectionHandlers, reactiveMap);
    }
    function readonly(target) {
        return createReactiveObject(target, true, readonlyHandlers, readonlyCollectionHandlers, readonlyMap);
    }
    function createReactiveObject(target, isReadonly, baseHandlers, collectionHandlers, proxyMap) {
        if (!isObject(target)) {
            if (true) {
                console.warn(`value cannot be made reactive: ${String(target)}`);
            }
            return target;
        }
        if (target[
            "__v_raw"
            /* RAW */
            ] && !(isReadonly && target[
            "__v_isReactive"
            /* IS_REACTIVE */
            ])) {
            return target;
        }
        const existingProxy = proxyMap.get(target);
        if (existingProxy) {
            return existingProxy;
        }
        const targetType = getTargetType(target);
        if (targetType === 0) {
            return target;
        }
        const proxy = new Proxy(target, targetType === 2 ? collectionHandlers : baseHandlers);
        proxyMap.set(target, proxy);
        return proxy;
    }
    function toRaw(observed) {
        return observed && toRaw(observed[
            "__v_raw"
            /* RAW */
            ]) || observed;
    }
    function isRef(r) {
        return Boolean(r && r.__v_isRef === true);
    }
    magic("nextTick", () => nextTick);
    magic("dispatch", (el) => dispatch.bind(dispatch, el));
    magic("watch", (el, { evaluateLater: evaluateLater2, cleanup: cleanup2 }) => (key, callback) => {
        let evaluate2 = evaluateLater2(key);
        let getter = () => {
            let value;
            evaluate2((i) => value = i);
            return value;
        };
        let unwatch = watch(getter, callback);
        cleanup2(unwatch);
    });
    magic("store", getStores);
    magic("data", (el) => scope(el));
    magic("root", (el) => closestRoot(el));
    magic("refs", (el) => {
        if (el._x_refs_proxy)
            return el._x_refs_proxy;
        el._x_refs_proxy = mergeProxies(getArrayOfRefObject(el));
        return el._x_refs_proxy;
    });
    function getArrayOfRefObject(el) {
        let refObjects = [];
        let currentEl = el;
        while (currentEl) {
            if (currentEl._x_refs)
                refObjects.push(currentEl._x_refs);
            currentEl = currentEl.parentNode;
        }
        return refObjects;
    }
    var globalIdMemo = {};
    function findAndIncrementId(name) {
        if (!globalIdMemo[name])
            globalIdMemo[name] = 0;
        return ++globalIdMemo[name];
    }
    function closestIdRoot(el, name) {
        return findClosest(el, (element) => {
            if (element._x_ids && element._x_ids[name])
                return true;
        });
    }
    function setIdRoot(el, name) {
        if (!el._x_ids)
            el._x_ids = {};
        if (!el._x_ids[name])
            el._x_ids[name] = findAndIncrementId(name);
    }
    magic("id", (el, { cleanup: cleanup2 }) => (name, key = null) => {
        let cacheKey = `${name}${key ? `-${key}` : ""}`;
        return cacheIdByNameOnElement(el, cacheKey, cleanup2, () => {
            let root = closestIdRoot(el, name);
            let id = root ? root._x_ids[name] : findAndIncrementId(name);
            return key ? `${name}-${id}-${key}` : `${name}-${id}`;
        });
    });
    interceptClone((from, to) => {
        if (from._x_id) {
            to._x_id = from._x_id;
        }
    });
    function cacheIdByNameOnElement(el, cacheKey, cleanup2, callback) {
        if (!el._x_id)
            el._x_id = {};
        if (el._x_id[cacheKey])
            return el._x_id[cacheKey];
        let output = callback();
        el._x_id[cacheKey] = output;
        cleanup2(() => {
            delete el._x_id[cacheKey];
        });
        return output;
    }
    magic("el", (el) => el);
    warnMissingPluginMagic("Focus", "focus", "focus");
    warnMissingPluginMagic("Persist", "persist", "persist");
    function warnMissingPluginMagic(name, magicName, slug) {
        magic(magicName, (el) => warn(`You can't use [$${magicName}] without first installing the "${name}" plugin here: https://alpinejs.dev/plugins/${slug}`, el));
    }
    directive("modelable", (el, { expression }, { effect: effect32, evaluateLater: evaluateLater2, cleanup: cleanup2 }) => {
        let func = evaluateLater2(expression);
        let innerGet = () => {
            let result;
            func((i) => result = i);
            return result;
        };
        let evaluateInnerSet = evaluateLater2(`${expression} = __placeholder`);
        let innerSet = (val) => evaluateInnerSet(() => {
        }, { scope: { "__placeholder": val } });
        let initialValue = innerGet();
        innerSet(initialValue);
        queueMicrotask(() => {
            if (!el._x_model)
                return;
            el._x_removeModelListeners["default"]();
            let outerGet = el._x_model.get;
            let outerSet = el._x_model.set;
            let releaseEntanglement = entangle(
                {
                    get() {
                        return outerGet();
                    },
                    set(value) {
                        outerSet(value);
                    }
                },
                {
                    get() {
                        return innerGet();
                    },
                    set(value) {
                        innerSet(value);
                    }
                }
            );
            cleanup2(releaseEntanglement);
        });
    });
    directive("teleport", (el, { modifiers, expression }, { cleanup: cleanup2 }) => {
        if (el.tagName.toLowerCase() !== "template")
            warn("x-teleport can only be used on a <template> tag", el);
        let target = getTarget(expression);
        let clone2 = el.content.cloneNode(true).firstElementChild;
        el._x_teleport = clone2;
        clone2._x_teleportBack = el;
        el.setAttribute("data-teleport-template", true);
        clone2.setAttribute("data-teleport-target", true);
        if (el._x_forwardEvents) {
            el._x_forwardEvents.forEach((eventName) => {
                clone2.addEventListener(eventName, (e) => {
                    e.stopPropagation();
                    el.dispatchEvent(new e.constructor(e.type, e));
                });
            });
        }
        addScopeToNode(clone2, {}, el);
        let placeInDom = (clone3, target2, modifiers2) => {
            if (modifiers2.includes("prepend")) {
                target2.parentNode.insertBefore(clone3, target2);
            } else if (modifiers2.includes("append")) {
                target2.parentNode.insertBefore(clone3, target2.nextSibling);
            } else {
                target2.appendChild(clone3);
            }
        };
        mutateDom(() => {
            placeInDom(clone2, target, modifiers);
            initTree(clone2);
            clone2._x_ignore = true;
        });
        el._x_teleportPutBack = () => {
            let target2 = getTarget(expression);
            mutateDom(() => {
                placeInDom(el._x_teleport, target2, modifiers);
            });
        };
        cleanup2(() => clone2.remove());
    });
    var teleportContainerDuringClone = document.createElement("div");
    function getTarget(expression) {
        let target = skipDuringClone(() => {
            return document.querySelector(expression);
        }, () => {
            return teleportContainerDuringClone;
        })();
        if (!target)
            warn(`Cannot find x-teleport element for selector: "${expression}"`);
        return target;
    }
    var handler = () => {
    };
    handler.inline = (el, { modifiers }, { cleanup: cleanup2 }) => {
        modifiers.includes("self") ? el._x_ignoreSelf = true : el._x_ignore = true;
        cleanup2(() => {
            modifiers.includes("self") ? delete el._x_ignoreSelf : delete el._x_ignore;
        });
    };
    directive("ignore", handler);
    directive("effect", skipDuringClone((el, { expression }, { effect: effect32 }) => {
        effect32(evaluateLater(el, expression));
    }));
    function on(el, event, modifiers, callback) {
        let listenerTarget = el;
        let handler4 = (e) => callback(e);
        let options = {};
        let wrapHandler = (callback2, wrapper) => (e) => wrapper(callback2, e);
        if (modifiers.includes("dot"))
            event = dotSyntax(event);
        if (modifiers.includes("camel"))
            event = camelCase2(event);
        if (modifiers.includes("passive"))
            options.passive = true;
        if (modifiers.includes("capture"))
            options.capture = true;
        if (modifiers.includes("window"))
            listenerTarget = window;
        if (modifiers.includes("document"))
            listenerTarget = document;
        if (modifiers.includes("debounce")) {
            let nextModifier = modifiers[modifiers.indexOf("debounce") + 1] || "invalid-wait";
            let wait = isNumeric(nextModifier.split("ms")[0]) ? Number(nextModifier.split("ms")[0]) : 250;
            handler4 = debounce(handler4, wait);
        }
        if (modifiers.includes("throttle")) {
            let nextModifier = modifiers[modifiers.indexOf("throttle") + 1] || "invalid-wait";
            let wait = isNumeric(nextModifier.split("ms")[0]) ? Number(nextModifier.split("ms")[0]) : 250;
            handler4 = throttle(handler4, wait);
        }
        if (modifiers.includes("prevent"))
            handler4 = wrapHandler(handler4, (next, e) => {
                e.preventDefault();
                next(e);
            });
        if (modifiers.includes("stop"))
            handler4 = wrapHandler(handler4, (next, e) => {
                e.stopPropagation();
                next(e);
            });
        if (modifiers.includes("self"))
            handler4 = wrapHandler(handler4, (next, e) => {
                e.target === el && next(e);
            });
        if (modifiers.includes("away") || modifiers.includes("outside")) {
            listenerTarget = document;
            handler4 = wrapHandler(handler4, (next, e) => {
                if (el.contains(e.target))
                    return;
                if (e.target.isConnected === false)
                    return;
                if (el.offsetWidth < 1 && el.offsetHeight < 1)
                    return;
                if (el._x_isShown === false)
                    return;
                next(e);
            });
        }
        if (modifiers.includes("once")) {
            handler4 = wrapHandler(handler4, (next, e) => {
                next(e);
                listenerTarget.removeEventListener(event, handler4, options);
            });
        }
        handler4 = wrapHandler(handler4, (next, e) => {
            if (isKeyEvent(event)) {
                if (isListeningForASpecificKeyThatHasntBeenPressed(e, modifiers)) {
                    return;
                }
            }
            next(e);
        });
        listenerTarget.addEventListener(event, handler4, options);
        return () => {
            listenerTarget.removeEventListener(event, handler4, options);
        };
    }
    function dotSyntax(subject) {
        return subject.replace(/-/g, ".");
    }
    function camelCase2(subject) {
        return subject.toLowerCase().replace(/-(\w)/g, (match, char) => char.toUpperCase());
    }
    function isNumeric(subject) {
        return !Array.isArray(subject) && !isNaN(subject);
    }
    function kebabCase2(subject) {
        if ([" ", "_"].includes(
            subject
        ))
            return subject;
        return subject.replace(/([a-z])([A-Z])/g, "$1-$2").replace(/[_\s]/, "-").toLowerCase();
    }
    function isKeyEvent(event) {
        return ["keydown", "keyup"].includes(event);
    }
    function isListeningForASpecificKeyThatHasntBeenPressed(e, modifiers) {
        let keyModifiers = modifiers.filter((i) => {
            return !["window", "document", "prevent", "stop", "once", "capture"].includes(i);
        });
        if (keyModifiers.includes("debounce")) {
            let debounceIndex = keyModifiers.indexOf("debounce");
            keyModifiers.splice(debounceIndex, isNumeric((keyModifiers[debounceIndex + 1] || "invalid-wait").split("ms")[0]) ? 2 : 1);
        }
        if (keyModifiers.includes("throttle")) {
            let debounceIndex = keyModifiers.indexOf("throttle");
            keyModifiers.splice(debounceIndex, isNumeric((keyModifiers[debounceIndex + 1] || "invalid-wait").split("ms")[0]) ? 2 : 1);
        }
        if (keyModifiers.length === 0)
            return false;
        if (keyModifiers.length === 1 && keyToModifiers(e.key).includes(keyModifiers[0]))
            return false;
        const systemKeyModifiers = ["ctrl", "shift", "alt", "meta", "cmd", "super"];
        const selectedSystemKeyModifiers = systemKeyModifiers.filter((modifier) => keyModifiers.includes(modifier));
        keyModifiers = keyModifiers.filter((i) => !selectedSystemKeyModifiers.includes(i));
        if (selectedSystemKeyModifiers.length > 0) {
            const activelyPressedKeyModifiers = selectedSystemKeyModifiers.filter((modifier) => {
                if (modifier === "cmd" || modifier === "super")
                    modifier = "meta";
                return e[`${modifier}Key`];
            });
            if (activelyPressedKeyModifiers.length === selectedSystemKeyModifiers.length) {
                if (keyToModifiers(e.key).includes(keyModifiers[0]))
                    return false;
            }
        }
        return true;
    }
    function keyToModifiers(key) {
        if (!key)
            return [];
        key = kebabCase2(key);
        let modifierToKeyMap = {
            "ctrl": "control",
            "slash": "/",
            "space": " ",
            "spacebar": " ",
            "cmd": "meta",
            "esc": "escape",
            "up": "arrow-up",
            "down": "arrow-down",
            "left": "arrow-left",
            "right": "arrow-right",
            "period": ".",
            "equal": "=",
            "minus": "-",
            "underscore": "_"
        };
        modifierToKeyMap[key] = key;
        return Object.keys(modifierToKeyMap).map((modifier) => {
            if (modifierToKeyMap[modifier] === key)
                return modifier;
        }).filter((modifier) => modifier);
    }
    directive("model", (el, { modifiers, expression }, { effect: effect32, cleanup: cleanup2 }) => {
        let scopeTarget = el;
        if (modifiers.includes("parent")) {
            scopeTarget = el.parentNode;
        }
        let evaluateGet = evaluateLater(scopeTarget, expression);
        let evaluateSet;
        if (typeof expression === "string") {
            evaluateSet = evaluateLater(scopeTarget, `${expression} = __placeholder`);
        } else if (typeof expression === "function" && typeof expression() === "string") {
            evaluateSet = evaluateLater(scopeTarget, `${expression()} = __placeholder`);
        } else {
            evaluateSet = () => {
            };
        }
        let getValue = () => {
            let result;
            evaluateGet((value) => result = value);
            return isGetterSetter(result) ? result.get() : result;
        };
        let setValue = (value) => {
            let result;
            evaluateGet((value2) => result = value2);
            if (isGetterSetter(result)) {
                result.set(value);
            } else {
                evaluateSet(() => {
                }, {
                    scope: { "__placeholder": value }
                });
            }
        };
        if (typeof expression === "string" && el.type === "radio") {
            mutateDom(() => {
                if (!el.hasAttribute("name"))
                    el.setAttribute("name", expression);
            });
        }
        var event = el.tagName.toLowerCase() === "select" || ["checkbox", "radio"].includes(el.type) || modifiers.includes("lazy") ? "change" : "input";
        let removeListener = isCloning ? () => {
        } : on(el, event, modifiers, (e) => {
            setValue(getInputValue(el, modifiers, e, getValue()));
        });
        if (modifiers.includes("fill")) {
            if ([void 0, null, ""].includes(getValue()) || el.type === "checkbox" && Array.isArray(getValue())) {
                el.dispatchEvent(new Event(event, {}));
            }
        }
        if (!el._x_removeModelListeners)
            el._x_removeModelListeners = {};
        el._x_removeModelListeners["default"] = removeListener;
        cleanup2(() => el._x_removeModelListeners["default"]());
        if (el.form) {
            let removeResetListener = on(el.form, "reset", [], (e) => {
                nextTick(() => el._x_model && el._x_model.set(el.value));
            });
            cleanup2(() => removeResetListener());
        }
        el._x_model = {
            get() {
                return getValue();
            },
            set(value) {
                setValue(value);
            }
        };
        el._x_forceModelUpdate = (value) => {
            if (value === void 0 && typeof expression === "string" && expression.match(/\./))
                value = "";
            window.fromModel = true;
            mutateDom(() => bind(el, "value", value));
            delete window.fromModel;
        };
        effect32(() => {
            let value = getValue();
            if (modifiers.includes("unintrusive") && document.activeElement.isSameNode(el))
                return;
            el._x_forceModelUpdate(value);
        });
    });
    function getInputValue(el, modifiers, event, currentValue) {
        return mutateDom(() => {
            if (event instanceof CustomEvent && event.detail !== void 0)
                return event.detail !== null && event.detail !== void 0 ? event.detail : event.target.value;
            else if (el.type === "checkbox") {
                if (Array.isArray(currentValue)) {
                    let newValue = null;
                    if (modifiers.includes("number")) {
                        newValue = safeParseNumber(event.target.value);
                    } else if (modifiers.includes("boolean")) {
                        newValue = safeParseBoolean(event.target.value);
                    } else {
                        newValue = event.target.value;
                    }
                    return event.target.checked ? currentValue.concat([newValue]) : currentValue.filter((el2) => !checkedAttrLooseCompare2(el2, newValue));
                } else {
                    return event.target.checked;
                }
            } else if (el.tagName.toLowerCase() === "select" && el.multiple) {
                if (modifiers.includes("number")) {
                    return Array.from(event.target.selectedOptions).map((option) => {
                        let rawValue = option.value || option.text;
                        return safeParseNumber(rawValue);
                    });
                } else if (modifiers.includes("boolean")) {
                    return Array.from(event.target.selectedOptions).map((option) => {
                        let rawValue = option.value || option.text;
                        return safeParseBoolean(rawValue);
                    });
                }
                return Array.from(event.target.selectedOptions).map((option) => {
                    return option.value || option.text;
                });
            } else {
                if (modifiers.includes("number")) {
                    return safeParseNumber(event.target.value);
                } else if (modifiers.includes("boolean")) {
                    return safeParseBoolean(event.target.value);
                }
                return modifiers.includes("trim") ? event.target.value.trim() : event.target.value;
            }
        });
    }
    function safeParseNumber(rawValue) {
        let number = rawValue ? parseFloat(rawValue) : null;
        return isNumeric2(number) ? number : rawValue;
    }
    function checkedAttrLooseCompare2(valueA, valueB) {
        return valueA == valueB;
    }
    function isNumeric2(subject) {
        return !Array.isArray(subject) && !isNaN(subject);
    }
    function isGetterSetter(value) {
        return value !== null && typeof value === "object" && typeof value.get === "function" && typeof value.set === "function";
    }
    directive("cloak", (el) => queueMicrotask(() => mutateDom(() => el.removeAttribute(prefix("cloak")))));
    addInitSelector(() => `[${prefix("init")}]`);
    directive("init", skipDuringClone((el, { expression }, { evaluate: evaluate2 }) => {
        if (typeof expression === "string") {
            return !!expression.trim() && evaluate2(expression, {}, false);
        }
        return evaluate2(expression, {}, false);
    }));
    directive("text", (el, { expression }, { effect: effect32, evaluateLater: evaluateLater2 }) => {
        let evaluate2 = evaluateLater2(expression);
        effect32(() => {
            evaluate2((value) => {
                mutateDom(() => {
                    el.textContent = value;
                });
            });
        });
    });
    directive("html", (el, { expression }, { effect: effect32, evaluateLater: evaluateLater2 }) => {
        let evaluate2 = evaluateLater2(expression);
        effect32(() => {
            evaluate2((value) => {
                mutateDom(() => {
                    el.innerHTML = value;
                    el._x_ignoreSelf = true;
                    initTree(el);
                    delete el._x_ignoreSelf;
                });
            });
        });
    });
    mapAttributes(startingWith(":", into(prefix("bind:"))));
    var handler2 = (el, { value, modifiers, expression, original }, { effect: effect32 }) => {
        if (!value) {
            let bindingProviders = {};
            injectBindingProviders(bindingProviders);
            let getBindings = evaluateLater(el, expression);
            getBindings((bindings) => {
                applyBindingsObject(el, bindings, original);
            }, { scope: bindingProviders });
            return;
        }
        if (value === "key")
            return storeKeyForXFor(el, expression);
        if (el._x_inlineBindings && el._x_inlineBindings[value] && el._x_inlineBindings[value].extract) {
            return;
        }
        let evaluate2 = evaluateLater(el, expression);
        effect32(() => evaluate2((result) => {
            if (result === void 0 && typeof expression === "string" && expression.match(/\./)) {
                result = "";
            }
            mutateDom(() => bind(el, value, result, modifiers));
        }));
    };
    handler2.inline = (el, { value, modifiers, expression }) => {
        if (!value)
            return;
        if (!el._x_inlineBindings)
            el._x_inlineBindings = {};
        el._x_inlineBindings[value] = { expression, extract: false };
    };
    directive("bind", handler2);
    function storeKeyForXFor(el, expression) {
        el._x_keyExpression = expression;
    }
    addRootSelector(() => `[${prefix("data")}]`);
    directive("data", (el, { expression }, { cleanup: cleanup2 }) => {
        if (shouldSkipRegisteringDataDuringClone(el))
            return;
        expression = expression === "" ? "{}" : expression;
        let magicContext = {};
        injectMagics(magicContext, el);
        let dataProviderContext = {};
        injectDataProviders(dataProviderContext, magicContext);
        let data2 = evaluate(el, expression, { scope: dataProviderContext });
        if (data2 === void 0 || data2 === true)
            data2 = {};
        injectMagics(data2, el);
        let reactiveData = reactive(data2);
        initInterceptors2(reactiveData);
        let undo = addScopeToNode(el, reactiveData);
        reactiveData["init"] && evaluate(el, reactiveData["init"]);
        cleanup2(() => {
            reactiveData["destroy"] && evaluate(el, reactiveData["destroy"]);
            undo();
        });
    });
    interceptClone((from, to) => {
        if (from._x_dataStack) {
            to._x_dataStack = from._x_dataStack;
            to.setAttribute("data-has-alpine-state", true);
        }
    });
    function shouldSkipRegisteringDataDuringClone(el) {
        if (!isCloning)
            return false;
        if (isCloningLegacy)
            return true;
        return el.hasAttribute("data-has-alpine-state");
    }
    directive("show", (el, { modifiers, expression }, { effect: effect32 }) => {
        let evaluate2 = evaluateLater(el, expression);
        if (!el._x_doHide)
            el._x_doHide = () => {
                mutateDom(() => {
                    el.style.setProperty("display", "none", modifiers.includes("important") ? "important" : void 0);
                });
            };
        if (!el._x_doShow)
            el._x_doShow = () => {
                mutateDom(() => {
                    if (el.style.length === 1 && el.style.display === "none") {
                        el.removeAttribute("style");
                    } else {
                        el.style.removeProperty("display");
                    }
                });
            };
        let hide2 = () => {
            el._x_doHide();
            el._x_isShown = false;
        };
        let show = () => {
            el._x_doShow();
            el._x_isShown = true;
        };
        let clickAwayCompatibleShow = () => setTimeout(show);
        let toggle = once(
            (value) => value ? show() : hide2(),
            (value) => {
                if (typeof el._x_toggleAndCascadeWithTransitions === "function") {
                    el._x_toggleAndCascadeWithTransitions(el, value, show, hide2);
                } else {
                    value ? clickAwayCompatibleShow() : hide2();
                }
            }
        );
        let oldValue;
        let firstTime = true;
        effect32(() => evaluate2((value) => {
            if (!firstTime && value === oldValue)
                return;
            if (modifiers.includes("immediate"))
                value ? clickAwayCompatibleShow() : hide2();
            toggle(value);
            oldValue = value;
            firstTime = false;
        }));
    });
    directive("for", (el, { expression }, { effect: effect32, cleanup: cleanup2 }) => {
        let iteratorNames = parseForExpression(expression);
        let evaluateItems = evaluateLater(el, iteratorNames.items);
        let evaluateKey = evaluateLater(
            el,
            // the x-bind:key expression is stored for our use instead of evaluated.
            el._x_keyExpression || "index"
        );
        el._x_prevKeys = [];
        el._x_lookup = {};
        effect32(() => loop(el, iteratorNames, evaluateItems, evaluateKey));
        cleanup2(() => {
            Object.values(el._x_lookup).forEach((el2) => el2.remove());
            delete el._x_prevKeys;
            delete el._x_lookup;
        });
    });
    function loop(el, iteratorNames, evaluateItems, evaluateKey) {
        let isObject2 = (i) => typeof i === "object" && !Array.isArray(i);
        let templateEl = el;
        evaluateItems((items) => {
            if (isNumeric3(items) && items >= 0) {
                items = Array.from(Array(items).keys(), (i) => i + 1);
            }
            if (items === void 0)
                items = [];
            let lookup = el._x_lookup;
            let prevKeys = el._x_prevKeys;
            let scopes = [];
            let keys = [];
            if (isObject2(items)) {
                items = Object.entries(items).map(([key, value]) => {
                    let scope2 = getIterationScopeVariables(iteratorNames, value, key, items);
                    evaluateKey((value2) => keys.push(value2), { scope: { index: key, ...scope2 } });
                    scopes.push(scope2);
                });
            } else {
                for (let i = 0; i < items.length; i++) {
                    let scope2 = getIterationScopeVariables(iteratorNames, items[i], i, items);
                    evaluateKey((value) => keys.push(value), { scope: { index: i, ...scope2 } });
                    scopes.push(scope2);
                }
            }
            let adds = [];
            let moves = [];
            let removes = [];
            let sames = [];
            for (let i = 0; i < prevKeys.length; i++) {
                let key = prevKeys[i];
                if (keys.indexOf(key) === -1)
                    removes.push(key);
            }
            prevKeys = prevKeys.filter((key) => !removes.includes(key));
            let lastKey = "template";
            for (let i = 0; i < keys.length; i++) {
                let key = keys[i];
                let prevIndex = prevKeys.indexOf(key);
                if (prevIndex === -1) {
                    prevKeys.splice(i, 0, key);
                    adds.push([lastKey, i]);
                } else if (prevIndex !== i) {
                    let keyInSpot = prevKeys.splice(i, 1)[0];
                    let keyForSpot = prevKeys.splice(prevIndex - 1, 1)[0];
                    prevKeys.splice(i, 0, keyForSpot);
                    prevKeys.splice(prevIndex, 0, keyInSpot);
                    moves.push([keyInSpot, keyForSpot]);
                } else {
                    sames.push(key);
                }
                lastKey = key;
            }
            for (let i = 0; i < removes.length; i++) {
                let key = removes[i];
                if (!!lookup[key]._x_effects) {
                    lookup[key]._x_effects.forEach(dequeueJob);
                }
                lookup[key].remove();
                lookup[key] = null;
                delete lookup[key];
            }
            for (let i = 0; i < moves.length; i++) {
                let [keyInSpot, keyForSpot] = moves[i];
                let elInSpot = lookup[keyInSpot];
                let elForSpot = lookup[keyForSpot];
                let marker = document.createElement("div");
                mutateDom(() => {
                    if (!elForSpot)
                        warn(`x-for ":key" is undefined or invalid`, templateEl);
                    elForSpot.after(marker);
                    elInSpot.after(elForSpot);
                    elForSpot._x_currentIfEl && elForSpot.after(elForSpot._x_currentIfEl);
                    marker.before(elInSpot);
                    elInSpot._x_currentIfEl && elInSpot.after(elInSpot._x_currentIfEl);
                    marker.remove();
                });
                elForSpot._x_refreshXForScope(scopes[keys.indexOf(keyForSpot)]);
            }
            for (let i = 0; i < adds.length; i++) {
                let [lastKey2, index] = adds[i];
                let lastEl = lastKey2 === "template" ? templateEl : lookup[lastKey2];
                if (lastEl._x_currentIfEl)
                    lastEl = lastEl._x_currentIfEl;
                let scope2 = scopes[index];
                let key = keys[index];
                let clone2 = document.importNode(templateEl.content, true).firstElementChild;
                let reactiveScope = reactive(scope2);
                addScopeToNode(clone2, reactiveScope, templateEl);
                clone2._x_refreshXForScope = (newScope) => {
                    Object.entries(newScope).forEach(([key2, value]) => {
                        reactiveScope[key2] = value;
                    });
                };
                mutateDom(() => {
                    lastEl.after(clone2);
                    initTree(clone2);
                });
                if (typeof key === "object") {
                    warn("x-for key cannot be an object, it must be a string or an integer", templateEl);
                }
                lookup[key] = clone2;
            }
            for (let i = 0; i < sames.length; i++) {
                lookup[sames[i]]._x_refreshXForScope(scopes[keys.indexOf(sames[i])]);
            }
            templateEl._x_prevKeys = keys;
        });
    }
    function parseForExpression(expression) {
        let forIteratorRE = /,([^,\}\]]*)(?:,([^,\}\]]*))?$/;
        let stripParensRE = /^\s*\(|\)\s*$/g;
        let forAliasRE = /([\s\S]*?)\s+(?:in|of)\s+([\s\S]*)/;
        let inMatch = expression.match(forAliasRE);
        if (!inMatch)
            return;
        let res = {};
        res.items = inMatch[2].trim();
        let item = inMatch[1].replace(stripParensRE, "").trim();
        let iteratorMatch = item.match(forIteratorRE);
        if (iteratorMatch) {
            res.item = item.replace(forIteratorRE, "").trim();
            res.index = iteratorMatch[1].trim();
            if (iteratorMatch[2]) {
                res.collection = iteratorMatch[2].trim();
            }
        } else {
            res.item = item;
        }
        return res;
    }
    function getIterationScopeVariables(iteratorNames, item, index, items) {
        let scopeVariables = {};
        if (/^\[.*\]$/.test(iteratorNames.item) && Array.isArray(item)) {
            let names = iteratorNames.item.replace("[", "").replace("]", "").split(",").map((i) => i.trim());
            names.forEach((name, i) => {
                scopeVariables[name] = item[i];
            });
        } else if (/^\{.*\}$/.test(iteratorNames.item) && !Array.isArray(item) && typeof item === "object") {
            let names = iteratorNames.item.replace("{", "").replace("}", "").split(",").map((i) => i.trim());
            names.forEach((name) => {
                scopeVariables[name] = item[name];
            });
        } else {
            scopeVariables[iteratorNames.item] = item;
        }
        if (iteratorNames.index)
            scopeVariables[iteratorNames.index] = index;
        if (iteratorNames.collection)
            scopeVariables[iteratorNames.collection] = items;
        return scopeVariables;
    }
    function isNumeric3(subject) {
        return !Array.isArray(subject) && !isNaN(subject);
    }
    function handler3() {
    }
    handler3.inline = (el, { expression }, { cleanup: cleanup2 }) => {
        let root = closestRoot(el);
        if (!root._x_refs)
            root._x_refs = {};
        root._x_refs[expression] = el;
        cleanup2(() => delete root._x_refs[expression]);
    };
    directive("ref", handler3);
    directive("if", (el, { expression }, { effect: effect32, cleanup: cleanup2 }) => {
        if (el.tagName.toLowerCase() !== "template")
            warn("x-if can only be used on a <template> tag", el);
        let evaluate2 = evaluateLater(el, expression);
        let show = () => {
            if (el._x_currentIfEl)
                return el._x_currentIfEl;
            let clone2 = el.content.cloneNode(true).firstElementChild;
            addScopeToNode(clone2, {}, el);
            mutateDom(() => {
                el.after(clone2);
                initTree(clone2);
            });
            el._x_currentIfEl = clone2;
            el._x_undoIf = () => {
                walk(clone2, (node) => {
                    if (!!node._x_effects) {
                        node._x_effects.forEach(dequeueJob);
                    }
                });
                clone2.remove();
                delete el._x_currentIfEl;
            };
            return clone2;
        };
        let hide2 = () => {
            if (!el._x_undoIf)
                return;
            el._x_undoIf();
            delete el._x_undoIf;
        };
        effect32(() => evaluate2((value) => {
            value ? show() : hide2();
        }));
        cleanup2(() => el._x_undoIf && el._x_undoIf());
    });
    directive("id", (el, { expression }, { evaluate: evaluate2 }) => {
        let names = evaluate2(expression);
        names.forEach((name) => setIdRoot(el, name));
    });
    interceptClone((from, to) => {
        if (from._x_ids) {
            to._x_ids = from._x_ids;
        }
    });
    mapAttributes(startingWith("@", into(prefix("on:"))));
    directive("on", skipDuringClone((el, { value, modifiers, expression }, { cleanup: cleanup2 }) => {
        let evaluate2 = expression ? evaluateLater(el, expression) : () => {
        };
        if (el.tagName.toLowerCase() === "template") {
            if (!el._x_forwardEvents)
                el._x_forwardEvents = [];
            if (!el._x_forwardEvents.includes(value))
                el._x_forwardEvents.push(value);
        }
        let removeListener = on(el, value, modifiers, (e) => {
            evaluate2(() => {
            }, { scope: { "$event": e }, params: [e] });
        });
        cleanup2(() => removeListener());
    }));
    warnMissingPluginDirective("Collapse", "collapse", "collapse");
    warnMissingPluginDirective("Intersect", "intersect", "intersect");
    warnMissingPluginDirective("Focus", "trap", "focus");
    warnMissingPluginDirective("Mask", "mask", "mask");
    function warnMissingPluginDirective(name, directiveName, slug) {
        directive(directiveName, (el) => warn(`You can't use [x-${directiveName}] without first installing the "${name}" plugin here: https://alpinejs.dev/plugins/${slug}`, el));
    }
    alpine_default.setEvaluator(normalEvaluator);
    alpine_default.setReactivityEngine({ reactive: reactive2, effect: effect2, release: stop, raw: toRaw });
    var src_default = alpine_default;
    var module_default = src_default;

    // node_modules/flowbite/lib/esm/dom/events.js
    var Events = (
        /** @class */
        function() {
            function Events2(eventType, eventFunctions) {
                if (eventFunctions === void 0) {
                    eventFunctions = [];
                }
                this._eventType = eventType;
                this._eventFunctions = eventFunctions;
            }
            Events2.prototype.init = function() {
                var _this = this;
                this._eventFunctions.forEach(function(eventFunction) {
                    if (typeof window !== "undefined") {
                        window.addEventListener(_this._eventType, eventFunction);
                    }
                });
            };
            return Events2;
        }()
    );
    var events_default = Events;

    // node_modules/flowbite/lib/esm/dom/instances.js
    var Instances = (
        /** @class */
        function() {
            function Instances2() {
                this._instances = {
                    Accordion: {},
                    Carousel: {},
                    Collapse: {},
                    Dial: {},
                    Dismiss: {},
                    Drawer: {},
                    Dropdown: {},
                    Modal: {},
                    Popover: {},
                    Tabs: {},
                    Tooltip: {},
                    InputCounter: {}
                };
            }
            Instances2.prototype.addInstance = function(component, instance, id, override) {
                if (override === void 0) {
                    override = false;
                }
                if (!this._instances[component]) {
                    console.warn("Flowbite: Component ".concat(component, " does not exist."));
                    return false;
                }
                if (this._instances[component][id] && !override) {
                    console.warn("Flowbite: Instance with ID ".concat(id, " already exists."));
                    return;
                }
                if (override && this._instances[component][id]) {
                    this._instances[component][id].destroyAndRemoveInstance();
                }
                this._instances[component][id ? id : this._generateRandomId()] = instance;
            };
            Instances2.prototype.getAllInstances = function() {
                return this._instances;
            };
            Instances2.prototype.getInstances = function(component) {
                if (!this._instances[component]) {
                    console.warn("Flowbite: Component ".concat(component, " does not exist."));
                    return false;
                }
                return this._instances[component];
            };
            Instances2.prototype.getInstance = function(component, id) {
                if (!this._componentAndInstanceCheck(component, id)) {
                    return;
                }
                if (!this._instances[component][id]) {
                    console.warn("Flowbite: Instance with ID ".concat(id, " does not exist."));
                    return;
                }
                return this._instances[component][id];
            };
            Instances2.prototype.destroyAndRemoveInstance = function(component, id) {
                if (!this._componentAndInstanceCheck(component, id)) {
                    return;
                }
                this.destroyInstanceObject(component, id);
                this.removeInstance(component, id);
            };
            Instances2.prototype.removeInstance = function(component, id) {
                if (!this._componentAndInstanceCheck(component, id)) {
                    return;
                }
                delete this._instances[component][id];
            };
            Instances2.prototype.destroyInstanceObject = function(component, id) {
                if (!this._componentAndInstanceCheck(component, id)) {
                    return;
                }
                this._instances[component][id].destroy();
            };
            Instances2.prototype.instanceExists = function(component, id) {
                if (!this._instances[component]) {
                    return false;
                }
                if (!this._instances[component][id]) {
                    return false;
                }
                return true;
            };
            Instances2.prototype._generateRandomId = function() {
                return Math.random().toString(36).substr(2, 9);
            };
            Instances2.prototype._componentAndInstanceCheck = function(component, id) {
                if (!this._instances[component]) {
                    console.warn("Flowbite: Component ".concat(component, " does not exist."));
                    return false;
                }
                if (!this._instances[component][id]) {
                    console.warn("Flowbite: Instance with ID ".concat(id, " does not exist."));
                    return false;
                }
                return true;
            };
            return Instances2;
        }()
    );
    var instances = new Instances();
    var instances_default = instances;
    if (typeof window !== "undefined") {
        window.FlowbiteInstances = instances;
    }

    // node_modules/flowbite/lib/esm/components/accordion/index.js
    var __assign = function() {
        __assign = Object.assign || function(t) {
            for (var s, i = 1, n = arguments.length; i < n; i++) {
                s = arguments[i];
                for (var p in s)
                    if (Object.prototype.hasOwnProperty.call(s, p))
                        t[p] = s[p];
            }
            return t;
        };
        return __assign.apply(this, arguments);
    };
    var Default = {
        alwaysOpen: false,
        activeClasses: "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white",
        inactiveClasses: "text-gray-500 dark:text-gray-400",
        onOpen: function() {
        },
        onClose: function() {
        },
        onToggle: function() {
        }
    };
    var DefaultInstanceOptions = {
        id: null,
        override: true
    };
    var Accordion = (
        /** @class */
        function() {
            function Accordion2(accordionEl, items, options, instanceOptions) {
                if (accordionEl === void 0) {
                    accordionEl = null;
                }
                if (items === void 0) {
                    items = [];
                }
                if (options === void 0) {
                    options = Default;
                }
                if (instanceOptions === void 0) {
                    instanceOptions = DefaultInstanceOptions;
                }
                this._instanceId = instanceOptions.id ? instanceOptions.id : accordionEl.id;
                this._accordionEl = accordionEl;
                this._items = items;
                this._options = __assign(__assign({}, Default), options);
                this._initialized = false;
                this.init();
                instances_default.addInstance("Accordion", this, this._instanceId, instanceOptions.override);
            }
            Accordion2.prototype.init = function() {
                var _this = this;
                if (this._items.length && !this._initialized) {
                    this._items.forEach(function(item) {
                        if (item.active) {
                            _this.open(item.id);
                        }
                        var clickHandler = function() {
                            _this.toggle(item.id);
                        };
                        item.triggerEl.addEventListener("click", clickHandler);
                        item.clickHandler = clickHandler;
                    });
                    this._initialized = true;
                }
            };
            Accordion2.prototype.destroy = function() {
                if (this._items.length && this._initialized) {
                    this._items.forEach(function(item) {
                        item.triggerEl.removeEventListener("click", item.clickHandler);
                        delete item.clickHandler;
                    });
                    this._initialized = false;
                }
            };
            Accordion2.prototype.removeInstance = function() {
                instances_default.removeInstance("Accordion", this._instanceId);
            };
            Accordion2.prototype.destroyAndRemoveInstance = function() {
                this.destroy();
                this.removeInstance();
            };
            Accordion2.prototype.getItem = function(id) {
                return this._items.filter(function(item) {
                    return item.id === id;
                })[0];
            };
            Accordion2.prototype.open = function(id) {
                var _a, _b;
                var _this = this;
                var item = this.getItem(id);
                if (!this._options.alwaysOpen) {
                    this._items.map(function(i) {
                        var _a2, _b2;
                        if (i !== item) {
                            (_a2 = i.triggerEl.classList).remove.apply(_a2, _this._options.activeClasses.split(" "));
                            (_b2 = i.triggerEl.classList).add.apply(_b2, _this._options.inactiveClasses.split(" "));
                            i.targetEl.classList.add("hidden");
                            i.triggerEl.setAttribute("aria-expanded", "false");
                            i.active = false;
                            if (i.iconEl) {
                                i.iconEl.classList.remove("rotate-180");
                            }
                        }
                    });
                }
                (_a = item.triggerEl.classList).add.apply(_a, this._options.activeClasses.split(" "));
                (_b = item.triggerEl.classList).remove.apply(_b, this._options.inactiveClasses.split(" "));
                item.triggerEl.setAttribute("aria-expanded", "true");
                item.targetEl.classList.remove("hidden");
                item.active = true;
                if (item.iconEl) {
                    item.iconEl.classList.add("rotate-180");
                }
                this._options.onOpen(this, item);
            };
            Accordion2.prototype.toggle = function(id) {
                var item = this.getItem(id);
                if (item.active) {
                    this.close(id);
                } else {
                    this.open(id);
                }
                this._options.onToggle(this, item);
            };
            Accordion2.prototype.close = function(id) {
                var _a, _b;
                var item = this.getItem(id);
                (_a = item.triggerEl.classList).remove.apply(_a, this._options.activeClasses.split(" "));
                (_b = item.triggerEl.classList).add.apply(_b, this._options.inactiveClasses.split(" "));
                item.targetEl.classList.add("hidden");
                item.triggerEl.setAttribute("aria-expanded", "false");
                item.active = false;
                if (item.iconEl) {
                    item.iconEl.classList.remove("rotate-180");
                }
                this._options.onClose(this, item);
            };
            return Accordion2;
        }()
    );
    function initAccordions() {
        document.querySelectorAll("[data-accordion]").forEach(function($accordionEl) {
            var alwaysOpen = $accordionEl.getAttribute("data-accordion");
            var activeClasses = $accordionEl.getAttribute("data-active-classes");
            var inactiveClasses = $accordionEl.getAttribute("data-inactive-classes");
            var items = [];
            $accordionEl.querySelectorAll("[data-accordion-target]").forEach(function($triggerEl) {
                if ($triggerEl.closest("[data-accordion]") === $accordionEl) {
                    var item = {
                        id: $triggerEl.getAttribute("data-accordion-target"),
                        triggerEl: $triggerEl,
                        targetEl: document.querySelector($triggerEl.getAttribute("data-accordion-target")),
                        iconEl: $triggerEl.querySelector("[data-accordion-icon]"),
                        active: $triggerEl.getAttribute("aria-expanded") === "true" ? true : false
                    };
                    items.push(item);
                }
            });
            new Accordion($accordionEl, items, {
                alwaysOpen: alwaysOpen === "open" ? true : false,
                activeClasses: activeClasses ? activeClasses : Default.activeClasses,
                inactiveClasses: inactiveClasses ? inactiveClasses : Default.inactiveClasses
            });
        });
    }
    if (typeof window !== "undefined") {
        window.Accordion = Accordion;
        window.initAccordions = initAccordions;
    }

    // node_modules/flowbite/lib/esm/components/collapse/index.js
    var __assign2 = function() {
        __assign2 = Object.assign || function(t) {
            for (var s, i = 1, n = arguments.length; i < n; i++) {
                s = arguments[i];
                for (var p in s)
                    if (Object.prototype.hasOwnProperty.call(s, p))
                        t[p] = s[p];
            }
            return t;
        };
        return __assign2.apply(this, arguments);
    };
    var Default2 = {
        onCollapse: function() {
        },
        onExpand: function() {
        },
        onToggle: function() {
        }
    };
    var DefaultInstanceOptions2 = {
        id: null,
        override: true
    };
    var Collapse = (
        /** @class */
        function() {
            function Collapse2(targetEl, triggerEl, options, instanceOptions) {
                if (targetEl === void 0) {
                    targetEl = null;
                }
                if (triggerEl === void 0) {
                    triggerEl = null;
                }
                if (options === void 0) {
                    options = Default2;
                }
                if (instanceOptions === void 0) {
                    instanceOptions = DefaultInstanceOptions2;
                }
                this._instanceId = instanceOptions.id ? instanceOptions.id : targetEl.id;
                this._targetEl = targetEl;
                this._triggerEl = triggerEl;
                this._options = __assign2(__assign2({}, Default2), options);
                this._visible = false;
                this._initialized = false;
                this.init();
                instances_default.addInstance("Collapse", this, this._instanceId, instanceOptions.override);
            }
            Collapse2.prototype.init = function() {
                var _this = this;
                if (this._triggerEl && this._targetEl && !this._initialized) {
                    if (this._triggerEl.hasAttribute("aria-expanded")) {
                        this._visible = this._triggerEl.getAttribute("aria-expanded") === "true";
                    } else {
                        this._visible = !this._targetEl.classList.contains("hidden");
                    }
                    this._clickHandler = function() {
                        _this.toggle();
                    };
                    this._triggerEl.addEventListener("click", this._clickHandler);
                    this._initialized = true;
                }
            };
            Collapse2.prototype.destroy = function() {
                if (this._triggerEl && this._initialized) {
                    this._triggerEl.removeEventListener("click", this._clickHandler);
                    this._initialized = false;
                }
            };
            Collapse2.prototype.removeInstance = function() {
                instances_default.removeInstance("Collapse", this._instanceId);
            };
            Collapse2.prototype.destroyAndRemoveInstance = function() {
                this.destroy();
                this.removeInstance();
            };
            Collapse2.prototype.collapse = function() {
                this._targetEl.classList.add("hidden");
                if (this._triggerEl) {
                    this._triggerEl.setAttribute("aria-expanded", "false");
                }
                this._visible = false;
                this._options.onCollapse(this);
            };
            Collapse2.prototype.expand = function() {
                this._targetEl.classList.remove("hidden");
                if (this._triggerEl) {
                    this._triggerEl.setAttribute("aria-expanded", "true");
                }
                this._visible = true;
                this._options.onExpand(this);
            };
            Collapse2.prototype.toggle = function() {
                if (this._visible) {
                    this.collapse();
                } else {
                    this.expand();
                }
                this._options.onToggle(this);
            };
            return Collapse2;
        }()
    );
    function initCollapses() {
        document.querySelectorAll("[data-collapse-toggle]").forEach(function($triggerEl) {
            var targetId = $triggerEl.getAttribute("data-collapse-toggle");
            var $targetEl = document.getElementById(targetId);
            if ($targetEl) {
                if (!instances_default.instanceExists("Collapse", $targetEl.getAttribute("id"))) {
                    new Collapse($targetEl, $triggerEl);
                } else {
                    new Collapse($targetEl, $triggerEl, {}, {
                        id: $targetEl.getAttribute("id") + "_" + instances_default._generateRandomId()
                    });
                }
            } else {
                console.error('The target element with id "'.concat(targetId, '" does not exist. Please check the data-collapse-toggle attribute.'));
            }
        });
    }
    if (typeof window !== "undefined") {
        window.Collapse = Collapse;
        window.initCollapses = initCollapses;
    }

    // node_modules/flowbite/lib/esm/components/carousel/index.js
    var __assign3 = function() {
        __assign3 = Object.assign || function(t) {
            for (var s, i = 1, n = arguments.length; i < n; i++) {
                s = arguments[i];
                for (var p in s)
                    if (Object.prototype.hasOwnProperty.call(s, p))
                        t[p] = s[p];
            }
            return t;
        };
        return __assign3.apply(this, arguments);
    };
    var Default3 = {
        defaultPosition: 0,
        indicators: {
            items: [],
            activeClasses: "bg-white dark:bg-gray-800",
            inactiveClasses: "bg-white/50 dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-800"
        },
        interval: 3e3,
        onNext: function() {
        },
        onPrev: function() {
        },
        onChange: function() {
        }
    };
    var DefaultInstanceOptions3 = {
        id: null,
        override: true
    };
    var Carousel = (
        /** @class */
        function() {
            function Carousel2(carouselEl, items, options, instanceOptions) {
                if (carouselEl === void 0) {
                    carouselEl = null;
                }
                if (items === void 0) {
                    items = [];
                }
                if (options === void 0) {
                    options = Default3;
                }
                if (instanceOptions === void 0) {
                    instanceOptions = DefaultInstanceOptions3;
                }
                this._instanceId = instanceOptions.id ? instanceOptions.id : carouselEl.id;
                this._carouselEl = carouselEl;
                this._items = items;
                this._options = __assign3(__assign3(__assign3({}, Default3), options), { indicators: __assign3(__assign3({}, Default3.indicators), options.indicators) });
                this._activeItem = this.getItem(this._options.defaultPosition);
                this._indicators = this._options.indicators.items;
                this._intervalDuration = this._options.interval;
                this._intervalInstance = null;
                this._initialized = false;
                this.init();
                instances_default.addInstance("Carousel", this, this._instanceId, instanceOptions.override);
            }
            Carousel2.prototype.init = function() {
                var _this = this;
                if (this._items.length && !this._initialized) {
                    this._items.map(function(item) {
                        item.el.classList.add("absolute", "inset-0", "transition-transform", "transform");
                    });
                    if (this._getActiveItem()) {
                        this.slideTo(this._getActiveItem().position);
                    } else {
                        this.slideTo(0);
                    }
                    this._indicators.map(function(indicator, position) {
                        indicator.el.addEventListener("click", function() {
                            _this.slideTo(position);
                        });
                    });
                    this._initialized = true;
                }
            };
            Carousel2.prototype.destroy = function() {
                if (this._initialized) {
                    this._initialized = false;
                }
            };
            Carousel2.prototype.removeInstance = function() {
                instances_default.removeInstance("Carousel", this._instanceId);
            };
            Carousel2.prototype.destroyAndRemoveInstance = function() {
                this.destroy();
                this.removeInstance();
            };
            Carousel2.prototype.getItem = function(position) {
                return this._items[position];
            };
            Carousel2.prototype.slideTo = function(position) {
                var nextItem = this._items[position];
                var rotationItems = {
                    left: nextItem.position === 0 ? this._items[this._items.length - 1] : this._items[nextItem.position - 1],
                    middle: nextItem,
                    right: nextItem.position === this._items.length - 1 ? this._items[0] : this._items[nextItem.position + 1]
                };
                this._rotate(rotationItems);
                this._setActiveItem(nextItem);
                if (this._intervalInstance) {
                    this.pause();
                    this.cycle();
                }
                this._options.onChange(this);
            };
            Carousel2.prototype.next = function() {
                var activeItem = this._getActiveItem();
                var nextItem = null;
                if (activeItem.position === this._items.length - 1) {
                    nextItem = this._items[0];
                } else {
                    nextItem = this._items[activeItem.position + 1];
                }
                this.slideTo(nextItem.position);
                this._options.onNext(this);
            };
            Carousel2.prototype.prev = function() {
                var activeItem = this._getActiveItem();
                var prevItem = null;
                if (activeItem.position === 0) {
                    prevItem = this._items[this._items.length - 1];
                } else {
                    prevItem = this._items[activeItem.position - 1];
                }
                this.slideTo(prevItem.position);
                this._options.onPrev(this);
            };
            Carousel2.prototype._rotate = function(rotationItems) {
                this._items.map(function(item) {
                    item.el.classList.add("hidden");
                });
                rotationItems.left.el.classList.remove("-translate-x-full", "translate-x-full", "translate-x-0", "hidden", "z-20");
                rotationItems.left.el.classList.add("-translate-x-full", "z-10");
                rotationItems.middle.el.classList.remove("-translate-x-full", "translate-x-full", "translate-x-0", "hidden", "z-10");
                rotationItems.middle.el.classList.add("translate-x-0", "z-20");
                rotationItems.right.el.classList.remove("-translate-x-full", "translate-x-full", "translate-x-0", "hidden", "z-20");
                rotationItems.right.el.classList.add("translate-x-full", "z-10");
            };
            Carousel2.prototype.cycle = function() {
                var _this = this;
                if (typeof window !== "undefined") {
                    this._intervalInstance = window.setInterval(function() {
                        _this.next();
                    }, this._intervalDuration);
                }
            };
            Carousel2.prototype.pause = function() {
                clearInterval(this._intervalInstance);
            };
            Carousel2.prototype._getActiveItem = function() {
                return this._activeItem;
            };
            Carousel2.prototype._setActiveItem = function(item) {
                var _a, _b;
                var _this = this;
                this._activeItem = item;
                var position = item.position;
                if (this._indicators.length) {
                    this._indicators.map(function(indicator) {
                        var _a2, _b2;
                        indicator.el.setAttribute("aria-current", "false");
                        (_a2 = indicator.el.classList).remove.apply(_a2, _this._options.indicators.activeClasses.split(" "));
                        (_b2 = indicator.el.classList).add.apply(_b2, _this._options.indicators.inactiveClasses.split(" "));
                    });
                    (_a = this._indicators[position].el.classList).add.apply(_a, this._options.indicators.activeClasses.split(" "));
                    (_b = this._indicators[position].el.classList).remove.apply(_b, this._options.indicators.inactiveClasses.split(" "));
                    this._indicators[position].el.setAttribute("aria-current", "true");
                }
            };
            return Carousel2;
        }()
    );
    function initCarousels() {
        document.querySelectorAll("[data-carousel]").forEach(function($carouselEl) {
            var interval = $carouselEl.getAttribute("data-carousel-interval");
            var slide = $carouselEl.getAttribute("data-carousel") === "slide" ? true : false;
            var items = [];
            var defaultPosition = 0;
            if ($carouselEl.querySelectorAll("[data-carousel-item]").length) {
                Array.from($carouselEl.querySelectorAll("[data-carousel-item]")).map(function($carouselItemEl, position) {
                    items.push({
                        position,
                        el: $carouselItemEl
                    });
                    if ($carouselItemEl.getAttribute("data-carousel-item") === "active") {
                        defaultPosition = position;
                    }
                });
            }
            var indicators = [];
            if ($carouselEl.querySelectorAll("[data-carousel-slide-to]").length) {
                Array.from($carouselEl.querySelectorAll("[data-carousel-slide-to]")).map(function($indicatorEl) {
                    indicators.push({
                        position: parseInt($indicatorEl.getAttribute("data-carousel-slide-to")),
                        el: $indicatorEl
                    });
                });
            }
            var carousel = new Carousel($carouselEl, items, {
                defaultPosition,
                indicators: {
                    items: indicators
                },
                interval: interval ? interval : Default3.interval
            });
            if (slide) {
                carousel.cycle();
            }
            var carouselNextEl = $carouselEl.querySelector("[data-carousel-next]");
            var carouselPrevEl = $carouselEl.querySelector("[data-carousel-prev]");
            if (carouselNextEl) {
                carouselNextEl.addEventListener("click", function() {
                    carousel.next();
                });
            }
            if (carouselPrevEl) {
                carouselPrevEl.addEventListener("click", function() {
                    carousel.prev();
                });
            }
        });
    }
    if (typeof window !== "undefined") {
        window.Carousel = Carousel;
        window.initCarousels = initCarousels;
    }

    // node_modules/flowbite/lib/esm/components/dismiss/index.js
    var __assign4 = function() {
        __assign4 = Object.assign || function(t) {
            for (var s, i = 1, n = arguments.length; i < n; i++) {
                s = arguments[i];
                for (var p in s)
                    if (Object.prototype.hasOwnProperty.call(s, p))
                        t[p] = s[p];
            }
            return t;
        };
        return __assign4.apply(this, arguments);
    };
    var Default4 = {
        transition: "transition-opacity",
        duration: 300,
        timing: "ease-out",
        onHide: function() {
        }
    };
    var DefaultInstanceOptions4 = {
        id: null,
        override: true
    };
    var Dismiss = (
        /** @class */
        function() {
            function Dismiss2(targetEl, triggerEl, options, instanceOptions) {
                if (targetEl === void 0) {
                    targetEl = null;
                }
                if (triggerEl === void 0) {
                    triggerEl = null;
                }
                if (options === void 0) {
                    options = Default4;
                }
                if (instanceOptions === void 0) {
                    instanceOptions = DefaultInstanceOptions4;
                }
                this._instanceId = instanceOptions.id ? instanceOptions.id : targetEl.id;
                this._targetEl = targetEl;
                this._triggerEl = triggerEl;
                this._options = __assign4(__assign4({}, Default4), options);
                this._initialized = false;
                this.init();
                instances_default.addInstance("Dismiss", this, this._instanceId, instanceOptions.override);
            }
            Dismiss2.prototype.init = function() {
                var _this = this;
                if (this._triggerEl && this._targetEl && !this._initialized) {
                    this._clickHandler = function() {
                        _this.hide();
                    };
                    this._triggerEl.addEventListener("click", this._clickHandler);
                    this._initialized = true;
                }
            };
            Dismiss2.prototype.destroy = function() {
                if (this._triggerEl && this._initialized) {
                    this._triggerEl.removeEventListener("click", this._clickHandler);
                    this._initialized = false;
                }
            };
            Dismiss2.prototype.removeInstance = function() {
                instances_default.removeInstance("Dismiss", this._instanceId);
            };
            Dismiss2.prototype.destroyAndRemoveInstance = function() {
                this.destroy();
                this.removeInstance();
            };
            Dismiss2.prototype.hide = function() {
                var _this = this;
                this._targetEl.classList.add(this._options.transition, "duration-".concat(this._options.duration), this._options.timing, "opacity-0");
                setTimeout(function() {
                    _this._targetEl.classList.add("hidden");
                }, this._options.duration);
                this._options.onHide(this, this._targetEl);
            };
            return Dismiss2;
        }()
    );
    function initDismisses() {
        document.querySelectorAll("[data-dismiss-target]").forEach(function($triggerEl) {
            var targetId = $triggerEl.getAttribute("data-dismiss-target");
            var $dismissEl = document.querySelector(targetId);
            if ($dismissEl) {
                new Dismiss($dismissEl, $triggerEl);
            } else {
                console.error('The dismiss element with id "'.concat(targetId, '" does not exist. Please check the data-dismiss-target attribute.'));
            }
        });
    }
    if (typeof window !== "undefined") {
        window.Dismiss = Dismiss;
        window.initDismisses = initDismisses;
    }

    // node_modules/@popperjs/core/lib/enums.js
    var top = "top";
    var bottom = "bottom";
    var right = "right";
    var left = "left";
    var auto = "auto";
    var basePlacements = [top, bottom, right, left];
    var start2 = "start";
    var end = "end";
    var clippingParents = "clippingParents";
    var viewport = "viewport";
    var popper = "popper";
    var reference = "reference";
    var variationPlacements = /* @__PURE__ */ basePlacements.reduce(function(acc, placement) {
        return acc.concat([placement + "-" + start2, placement + "-" + end]);
    }, []);
    var placements = /* @__PURE__ */ [].concat(basePlacements, [auto]).reduce(function(acc, placement) {
        return acc.concat([placement, placement + "-" + start2, placement + "-" + end]);
    }, []);
    var beforeRead = "beforeRead";
    var read = "read";
    var afterRead = "afterRead";
    var beforeMain = "beforeMain";
    var main = "main";
    var afterMain = "afterMain";
    var beforeWrite = "beforeWrite";
    var write = "write";
    var afterWrite = "afterWrite";
    var modifierPhases = [beforeRead, read, afterRead, beforeMain, main, afterMain, beforeWrite, write, afterWrite];

    // node_modules/@popperjs/core/lib/dom-utils/getNodeName.js
    function getNodeName(element) {
        return element ? (element.nodeName || "").toLowerCase() : null;
    }

    // node_modules/@popperjs/core/lib/dom-utils/getWindow.js
    function getWindow(node) {
        if (node == null) {
            return window;
        }
        if (node.toString() !== "[object Window]") {
            var ownerDocument = node.ownerDocument;
            return ownerDocument ? ownerDocument.defaultView || window : window;
        }
        return node;
    }

    // node_modules/@popperjs/core/lib/dom-utils/instanceOf.js
    function isElement(node) {
        var OwnElement = getWindow(node).Element;
        return node instanceof OwnElement || node instanceof Element;
    }
    function isHTMLElement(node) {
        var OwnElement = getWindow(node).HTMLElement;
        return node instanceof OwnElement || node instanceof HTMLElement;
    }
    function isShadowRoot(node) {
        if (typeof ShadowRoot === "undefined") {
            return false;
        }
        var OwnElement = getWindow(node).ShadowRoot;
        return node instanceof OwnElement || node instanceof ShadowRoot;
    }

    // node_modules/@popperjs/core/lib/modifiers/applyStyles.js
    function applyStyles(_ref) {
        var state = _ref.state;
        Object.keys(state.elements).forEach(function(name) {
            var style = state.styles[name] || {};
            var attributes = state.attributes[name] || {};
            var element = state.elements[name];
            if (!isHTMLElement(element) || !getNodeName(element)) {
                return;
            }
            Object.assign(element.style, style);
            Object.keys(attributes).forEach(function(name2) {
                var value = attributes[name2];
                if (value === false) {
                    element.removeAttribute(name2);
                } else {
                    element.setAttribute(name2, value === true ? "" : value);
                }
            });
        });
    }
    function effect3(_ref2) {
        var state = _ref2.state;
        var initialStyles = {
            popper: {
                position: state.options.strategy,
                left: "0",
                top: "0",
                margin: "0"
            },
            arrow: {
                position: "absolute"
            },
            reference: {}
        };
        Object.assign(state.elements.popper.style, initialStyles.popper);
        state.styles = initialStyles;
        if (state.elements.arrow) {
            Object.assign(state.elements.arrow.style, initialStyles.arrow);
        }
        return function() {
            Object.keys(state.elements).forEach(function(name) {
                var element = state.elements[name];
                var attributes = state.attributes[name] || {};
                var styleProperties = Object.keys(state.styles.hasOwnProperty(name) ? state.styles[name] : initialStyles[name]);
                var style = styleProperties.reduce(function(style2, property) {
                    style2[property] = "";
                    return style2;
                }, {});
                if (!isHTMLElement(element) || !getNodeName(element)) {
                    return;
                }
                Object.assign(element.style, style);
                Object.keys(attributes).forEach(function(attribute) {
                    element.removeAttribute(attribute);
                });
            });
        };
    }
    var applyStyles_default = {
        name: "applyStyles",
        enabled: true,
        phase: "write",
        fn: applyStyles,
        effect: effect3,
        requires: ["computeStyles"]
    };

    // node_modules/@popperjs/core/lib/utils/getBasePlacement.js
    function getBasePlacement(placement) {
        return placement.split("-")[0];
    }

    // node_modules/@popperjs/core/lib/utils/math.js
    var max = Math.max;
    var min = Math.min;
    var round = Math.round;

    // node_modules/@popperjs/core/lib/utils/userAgent.js
    function getUAString() {
        var uaData = navigator.userAgentData;
        if (uaData != null && uaData.brands && Array.isArray(uaData.brands)) {
            return uaData.brands.map(function(item) {
                return item.brand + "/" + item.version;
            }).join(" ");
        }
        return navigator.userAgent;
    }

    // node_modules/@popperjs/core/lib/dom-utils/isLayoutViewport.js
    function isLayoutViewport() {
        return !/^((?!chrome|android).)*safari/i.test(getUAString());
    }

    // node_modules/@popperjs/core/lib/dom-utils/getBoundingClientRect.js
    function getBoundingClientRect(element, includeScale, isFixedStrategy) {
        if (includeScale === void 0) {
            includeScale = false;
        }
        if (isFixedStrategy === void 0) {
            isFixedStrategy = false;
        }
        var clientRect = element.getBoundingClientRect();
        var scaleX = 1;
        var scaleY = 1;
        if (includeScale && isHTMLElement(element)) {
            scaleX = element.offsetWidth > 0 ? round(clientRect.width) / element.offsetWidth || 1 : 1;
            scaleY = element.offsetHeight > 0 ? round(clientRect.height) / element.offsetHeight || 1 : 1;
        }
        var _ref = isElement(element) ? getWindow(element) : window, visualViewport = _ref.visualViewport;
        var addVisualOffsets = !isLayoutViewport() && isFixedStrategy;
        var x = (clientRect.left + (addVisualOffsets && visualViewport ? visualViewport.offsetLeft : 0)) / scaleX;
        var y = (clientRect.top + (addVisualOffsets && visualViewport ? visualViewport.offsetTop : 0)) / scaleY;
        var width = clientRect.width / scaleX;
        var height = clientRect.height / scaleY;
        return {
            width,
            height,
            top: y,
            right: x + width,
            bottom: y + height,
            left: x,
            x,
            y
        };
    }

    // node_modules/@popperjs/core/lib/dom-utils/getLayoutRect.js
    function getLayoutRect(element) {
        var clientRect = getBoundingClientRect(element);
        var width = element.offsetWidth;
        var height = element.offsetHeight;
        if (Math.abs(clientRect.width - width) <= 1) {
            width = clientRect.width;
        }
        if (Math.abs(clientRect.height - height) <= 1) {
            height = clientRect.height;
        }
        return {
            x: element.offsetLeft,
            y: element.offsetTop,
            width,
            height
        };
    }

    // node_modules/@popperjs/core/lib/dom-utils/contains.js
    function contains(parent, child) {
        var rootNode = child.getRootNode && child.getRootNode();
        if (parent.contains(child)) {
            return true;
        } else if (rootNode && isShadowRoot(rootNode)) {
            var next = child;
            do {
                if (next && parent.isSameNode(next)) {
                    return true;
                }
                next = next.parentNode || next.host;
            } while (next);
        }
        return false;
    }

    // node_modules/@popperjs/core/lib/dom-utils/getComputedStyle.js
    function getComputedStyle2(element) {
        return getWindow(element).getComputedStyle(element);
    }

    // node_modules/@popperjs/core/lib/dom-utils/isTableElement.js
    function isTableElement(element) {
        return ["table", "td", "th"].indexOf(getNodeName(element)) >= 0;
    }

    // node_modules/@popperjs/core/lib/dom-utils/getDocumentElement.js
    function getDocumentElement(element) {
        return ((isElement(element) ? element.ownerDocument : (
            // $FlowFixMe[prop-missing]
            element.document
        )) || window.document).documentElement;
    }

    // node_modules/@popperjs/core/lib/dom-utils/getParentNode.js
    function getParentNode(element) {
        if (getNodeName(element) === "html") {
            return element;
        }
        return (
            // this is a quicker (but less type safe) way to save quite some bytes from the bundle
            // $FlowFixMe[incompatible-return]
            // $FlowFixMe[prop-missing]
            element.assignedSlot || // step into the shadow DOM of the parent of a slotted node
            element.parentNode || // DOM Element detected
            (isShadowRoot(element) ? element.host : null) || // ShadowRoot detected
            // $FlowFixMe[incompatible-call]: HTMLElement is a Node
            getDocumentElement(element)
        );
    }

    // node_modules/@popperjs/core/lib/dom-utils/getOffsetParent.js
    function getTrueOffsetParent(element) {
        if (!isHTMLElement(element) || // https://github.com/popperjs/popper-core/issues/837
            getComputedStyle2(element).position === "fixed") {
            return null;
        }
        return element.offsetParent;
    }
    function getContainingBlock(element) {
        var isFirefox = /firefox/i.test(getUAString());
        var isIE = /Trident/i.test(getUAString());
        if (isIE && isHTMLElement(element)) {
            var elementCss = getComputedStyle2(element);
            if (elementCss.position === "fixed") {
                return null;
            }
        }
        var currentNode = getParentNode(element);
        if (isShadowRoot(currentNode)) {
            currentNode = currentNode.host;
        }
        while (isHTMLElement(currentNode) && ["html", "body"].indexOf(getNodeName(currentNode)) < 0) {
            var css = getComputedStyle2(currentNode);
            if (css.transform !== "none" || css.perspective !== "none" || css.contain === "paint" || ["transform", "perspective"].indexOf(css.willChange) !== -1 || isFirefox && css.willChange === "filter" || isFirefox && css.filter && css.filter !== "none") {
                return currentNode;
            } else {
                currentNode = currentNode.parentNode;
            }
        }
        return null;
    }
    function getOffsetParent(element) {
        var window2 = getWindow(element);
        var offsetParent = getTrueOffsetParent(element);
        while (offsetParent && isTableElement(offsetParent) && getComputedStyle2(offsetParent).position === "static") {
            offsetParent = getTrueOffsetParent(offsetParent);
        }
        if (offsetParent && (getNodeName(offsetParent) === "html" || getNodeName(offsetParent) === "body" && getComputedStyle2(offsetParent).position === "static")) {
            return window2;
        }
        return offsetParent || getContainingBlock(element) || window2;
    }

    // node_modules/@popperjs/core/lib/utils/getMainAxisFromPlacement.js
    function getMainAxisFromPlacement(placement) {
        return ["top", "bottom"].indexOf(placement) >= 0 ? "x" : "y";
    }

    // node_modules/@popperjs/core/lib/utils/within.js
    function within(min2, value, max2) {
        return max(min2, min(value, max2));
    }
    function withinMaxClamp(min2, value, max2) {
        var v = within(min2, value, max2);
        return v > max2 ? max2 : v;
    }

    // node_modules/@popperjs/core/lib/utils/getFreshSideObject.js
    function getFreshSideObject() {
        return {
            top: 0,
            right: 0,
            bottom: 0,
            left: 0
        };
    }

    // node_modules/@popperjs/core/lib/utils/mergePaddingObject.js
    function mergePaddingObject(paddingObject) {
        return Object.assign({}, getFreshSideObject(), paddingObject);
    }

    // node_modules/@popperjs/core/lib/utils/expandToHashMap.js
    function expandToHashMap(value, keys) {
        return keys.reduce(function(hashMap, key) {
            hashMap[key] = value;
            return hashMap;
        }, {});
    }

    // node_modules/@popperjs/core/lib/modifiers/arrow.js
    var toPaddingObject = function toPaddingObject2(padding, state) {
        padding = typeof padding === "function" ? padding(Object.assign({}, state.rects, {
            placement: state.placement
        })) : padding;
        return mergePaddingObject(typeof padding !== "number" ? padding : expandToHashMap(padding, basePlacements));
    };
    function arrow(_ref) {
        var _state$modifiersData$;
        var state = _ref.state, name = _ref.name, options = _ref.options;
        var arrowElement = state.elements.arrow;
        var popperOffsets2 = state.modifiersData.popperOffsets;
        var basePlacement = getBasePlacement(state.placement);
        var axis = getMainAxisFromPlacement(basePlacement);
        var isVertical = [left, right].indexOf(basePlacement) >= 0;
        var len = isVertical ? "height" : "width";
        if (!arrowElement || !popperOffsets2) {
            return;
        }
        var paddingObject = toPaddingObject(options.padding, state);
        var arrowRect = getLayoutRect(arrowElement);
        var minProp = axis === "y" ? top : left;
        var maxProp = axis === "y" ? bottom : right;
        var endDiff = state.rects.reference[len] + state.rects.reference[axis] - popperOffsets2[axis] - state.rects.popper[len];
        var startDiff = popperOffsets2[axis] - state.rects.reference[axis];
        var arrowOffsetParent = getOffsetParent(arrowElement);
        var clientSize = arrowOffsetParent ? axis === "y" ? arrowOffsetParent.clientHeight || 0 : arrowOffsetParent.clientWidth || 0 : 0;
        var centerToReference = endDiff / 2 - startDiff / 2;
        var min2 = paddingObject[minProp];
        var max2 = clientSize - arrowRect[len] - paddingObject[maxProp];
        var center = clientSize / 2 - arrowRect[len] / 2 + centerToReference;
        var offset2 = within(min2, center, max2);
        var axisProp = axis;
        state.modifiersData[name] = (_state$modifiersData$ = {}, _state$modifiersData$[axisProp] = offset2, _state$modifiersData$.centerOffset = offset2 - center, _state$modifiersData$);
    }
    function effect4(_ref2) {
        var state = _ref2.state, options = _ref2.options;
        var _options$element = options.element, arrowElement = _options$element === void 0 ? "[data-popper-arrow]" : _options$element;
        if (arrowElement == null) {
            return;
        }
        if (typeof arrowElement === "string") {
            arrowElement = state.elements.popper.querySelector(arrowElement);
            if (!arrowElement) {
                return;
            }
        }
        if (!contains(state.elements.popper, arrowElement)) {
            return;
        }
        state.elements.arrow = arrowElement;
    }
    var arrow_default = {
        name: "arrow",
        enabled: true,
        phase: "main",
        fn: arrow,
        effect: effect4,
        requires: ["popperOffsets"],
        requiresIfExists: ["preventOverflow"]
    };

    // node_modules/@popperjs/core/lib/utils/getVariation.js
    function getVariation(placement) {
        return placement.split("-")[1];
    }

    // node_modules/@popperjs/core/lib/modifiers/computeStyles.js
    var unsetSides = {
        top: "auto",
        right: "auto",
        bottom: "auto",
        left: "auto"
    };
    function roundOffsetsByDPR(_ref, win) {
        var x = _ref.x, y = _ref.y;
        var dpr = win.devicePixelRatio || 1;
        return {
            x: round(x * dpr) / dpr || 0,
            y: round(y * dpr) / dpr || 0
        };
    }
    function mapToStyles(_ref2) {
        var _Object$assign2;
        var popper2 = _ref2.popper, popperRect = _ref2.popperRect, placement = _ref2.placement, variation = _ref2.variation, offsets = _ref2.offsets, position = _ref2.position, gpuAcceleration = _ref2.gpuAcceleration, adaptive = _ref2.adaptive, roundOffsets = _ref2.roundOffsets, isFixed = _ref2.isFixed;
        var _offsets$x = offsets.x, x = _offsets$x === void 0 ? 0 : _offsets$x, _offsets$y = offsets.y, y = _offsets$y === void 0 ? 0 : _offsets$y;
        var _ref3 = typeof roundOffsets === "function" ? roundOffsets({
            x,
            y
        }) : {
            x,
            y
        };
        x = _ref3.x;
        y = _ref3.y;
        var hasX = offsets.hasOwnProperty("x");
        var hasY = offsets.hasOwnProperty("y");
        var sideX = left;
        var sideY = top;
        var win = window;
        if (adaptive) {
            var offsetParent = getOffsetParent(popper2);
            var heightProp = "clientHeight";
            var widthProp = "clientWidth";
            if (offsetParent === getWindow(popper2)) {
                offsetParent = getDocumentElement(popper2);
                if (getComputedStyle2(offsetParent).position !== "static" && position === "absolute") {
                    heightProp = "scrollHeight";
                    widthProp = "scrollWidth";
                }
            }
            offsetParent = offsetParent;
            if (placement === top || (placement === left || placement === right) && variation === end) {
                sideY = bottom;
                var offsetY = isFixed && offsetParent === win && win.visualViewport ? win.visualViewport.height : (
                    // $FlowFixMe[prop-missing]
                    offsetParent[heightProp]
                );
                y -= offsetY - popperRect.height;
                y *= gpuAcceleration ? 1 : -1;
            }
            if (placement === left || (placement === top || placement === bottom) && variation === end) {
                sideX = right;
                var offsetX = isFixed && offsetParent === win && win.visualViewport ? win.visualViewport.width : (
                    // $FlowFixMe[prop-missing]
                    offsetParent[widthProp]
                );
                x -= offsetX - popperRect.width;
                x *= gpuAcceleration ? 1 : -1;
            }
        }
        var commonStyles = Object.assign({
            position
        }, adaptive && unsetSides);
        var _ref4 = roundOffsets === true ? roundOffsetsByDPR({
            x,
            y
        }, getWindow(popper2)) : {
            x,
            y
        };
        x = _ref4.x;
        y = _ref4.y;
        if (gpuAcceleration) {
            var _Object$assign;
            return Object.assign({}, commonStyles, (_Object$assign = {}, _Object$assign[sideY] = hasY ? "0" : "", _Object$assign[sideX] = hasX ? "0" : "", _Object$assign.transform = (win.devicePixelRatio || 1) <= 1 ? "translate(" + x + "px, " + y + "px)" : "translate3d(" + x + "px, " + y + "px, 0)", _Object$assign));
        }
        return Object.assign({}, commonStyles, (_Object$assign2 = {}, _Object$assign2[sideY] = hasY ? y + "px" : "", _Object$assign2[sideX] = hasX ? x + "px" : "", _Object$assign2.transform = "", _Object$assign2));
    }
    function computeStyles(_ref5) {
        var state = _ref5.state, options = _ref5.options;
        var _options$gpuAccelerat = options.gpuAcceleration, gpuAcceleration = _options$gpuAccelerat === void 0 ? true : _options$gpuAccelerat, _options$adaptive = options.adaptive, adaptive = _options$adaptive === void 0 ? true : _options$adaptive, _options$roundOffsets = options.roundOffsets, roundOffsets = _options$roundOffsets === void 0 ? true : _options$roundOffsets;
        var commonStyles = {
            placement: getBasePlacement(state.placement),
            variation: getVariation(state.placement),
            popper: state.elements.popper,
            popperRect: state.rects.popper,
            gpuAcceleration,
            isFixed: state.options.strategy === "fixed"
        };
        if (state.modifiersData.popperOffsets != null) {
            state.styles.popper = Object.assign({}, state.styles.popper, mapToStyles(Object.assign({}, commonStyles, {
                offsets: state.modifiersData.popperOffsets,
                position: state.options.strategy,
                adaptive,
                roundOffsets
            })));
        }
        if (state.modifiersData.arrow != null) {
            state.styles.arrow = Object.assign({}, state.styles.arrow, mapToStyles(Object.assign({}, commonStyles, {
                offsets: state.modifiersData.arrow,
                position: "absolute",
                adaptive: false,
                roundOffsets
            })));
        }
        state.attributes.popper = Object.assign({}, state.attributes.popper, {
            "data-popper-placement": state.placement
        });
    }
    var computeStyles_default = {
        name: "computeStyles",
        enabled: true,
        phase: "beforeWrite",
        fn: computeStyles,
        data: {}
    };

    // node_modules/@popperjs/core/lib/modifiers/eventListeners.js
    var passive = {
        passive: true
    };
    function effect5(_ref) {
        var state = _ref.state, instance = _ref.instance, options = _ref.options;
        var _options$scroll = options.scroll, scroll = _options$scroll === void 0 ? true : _options$scroll, _options$resize = options.resize, resize = _options$resize === void 0 ? true : _options$resize;
        var window2 = getWindow(state.elements.popper);
        var scrollParents = [].concat(state.scrollParents.reference, state.scrollParents.popper);
        if (scroll) {
            scrollParents.forEach(function(scrollParent) {
                scrollParent.addEventListener("scroll", instance.update, passive);
            });
        }
        if (resize) {
            window2.addEventListener("resize", instance.update, passive);
        }
        return function() {
            if (scroll) {
                scrollParents.forEach(function(scrollParent) {
                    scrollParent.removeEventListener("scroll", instance.update, passive);
                });
            }
            if (resize) {
                window2.removeEventListener("resize", instance.update, passive);
            }
        };
    }
    var eventListeners_default = {
        name: "eventListeners",
        enabled: true,
        phase: "write",
        fn: function fn() {
        },
        effect: effect5,
        data: {}
    };

    // node_modules/@popperjs/core/lib/utils/getOppositePlacement.js
    var hash = {
        left: "right",
        right: "left",
        bottom: "top",
        top: "bottom"
    };
    function getOppositePlacement(placement) {
        return placement.replace(/left|right|bottom|top/g, function(matched) {
            return hash[matched];
        });
    }

    // node_modules/@popperjs/core/lib/utils/getOppositeVariationPlacement.js
    var hash2 = {
        start: "end",
        end: "start"
    };
    function getOppositeVariationPlacement(placement) {
        return placement.replace(/start|end/g, function(matched) {
            return hash2[matched];
        });
    }

    // node_modules/@popperjs/core/lib/dom-utils/getWindowScroll.js
    function getWindowScroll(node) {
        var win = getWindow(node);
        var scrollLeft = win.pageXOffset;
        var scrollTop = win.pageYOffset;
        return {
            scrollLeft,
            scrollTop
        };
    }

    // node_modules/@popperjs/core/lib/dom-utils/getWindowScrollBarX.js
    function getWindowScrollBarX(element) {
        return getBoundingClientRect(getDocumentElement(element)).left + getWindowScroll(element).scrollLeft;
    }

    // node_modules/@popperjs/core/lib/dom-utils/getViewportRect.js
    function getViewportRect(element, strategy) {
        var win = getWindow(element);
        var html = getDocumentElement(element);
        var visualViewport = win.visualViewport;
        var width = html.clientWidth;
        var height = html.clientHeight;
        var x = 0;
        var y = 0;
        if (visualViewport) {
            width = visualViewport.width;
            height = visualViewport.height;
            var layoutViewport = isLayoutViewport();
            if (layoutViewport || !layoutViewport && strategy === "fixed") {
                x = visualViewport.offsetLeft;
                y = visualViewport.offsetTop;
            }
        }
        return {
            width,
            height,
            x: x + getWindowScrollBarX(element),
            y
        };
    }

    // node_modules/@popperjs/core/lib/dom-utils/getDocumentRect.js
    function getDocumentRect(element) {
        var _element$ownerDocumen;
        var html = getDocumentElement(element);
        var winScroll = getWindowScroll(element);
        var body = (_element$ownerDocumen = element.ownerDocument) == null ? void 0 : _element$ownerDocumen.body;
        var width = max(html.scrollWidth, html.clientWidth, body ? body.scrollWidth : 0, body ? body.clientWidth : 0);
        var height = max(html.scrollHeight, html.clientHeight, body ? body.scrollHeight : 0, body ? body.clientHeight : 0);
        var x = -winScroll.scrollLeft + getWindowScrollBarX(element);
        var y = -winScroll.scrollTop;
        if (getComputedStyle2(body || html).direction === "rtl") {
            x += max(html.clientWidth, body ? body.clientWidth : 0) - width;
        }
        return {
            width,
            height,
            x,
            y
        };
    }

    // node_modules/@popperjs/core/lib/dom-utils/isScrollParent.js
    function isScrollParent(element) {
        var _getComputedStyle = getComputedStyle2(element), overflow = _getComputedStyle.overflow, overflowX = _getComputedStyle.overflowX, overflowY = _getComputedStyle.overflowY;
        return /auto|scroll|overlay|hidden/.test(overflow + overflowY + overflowX);
    }

    // node_modules/@popperjs/core/lib/dom-utils/getScrollParent.js
    function getScrollParent(node) {
        if (["html", "body", "#document"].indexOf(getNodeName(node)) >= 0) {
            return node.ownerDocument.body;
        }
        if (isHTMLElement(node) && isScrollParent(node)) {
            return node;
        }
        return getScrollParent(getParentNode(node));
    }

    // node_modules/@popperjs/core/lib/dom-utils/listScrollParents.js
    function listScrollParents(element, list) {
        var _element$ownerDocumen;
        if (list === void 0) {
            list = [];
        }
        var scrollParent = getScrollParent(element);
        var isBody = scrollParent === ((_element$ownerDocumen = element.ownerDocument) == null ? void 0 : _element$ownerDocumen.body);
        var win = getWindow(scrollParent);
        var target = isBody ? [win].concat(win.visualViewport || [], isScrollParent(scrollParent) ? scrollParent : []) : scrollParent;
        var updatedList = list.concat(target);
        return isBody ? updatedList : (
            // $FlowFixMe[incompatible-call]: isBody tells us target will be an HTMLElement here
            updatedList.concat(listScrollParents(getParentNode(target)))
        );
    }

    // node_modules/@popperjs/core/lib/utils/rectToClientRect.js
    function rectToClientRect(rect) {
        return Object.assign({}, rect, {
            left: rect.x,
            top: rect.y,
            right: rect.x + rect.width,
            bottom: rect.y + rect.height
        });
    }

    // node_modules/@popperjs/core/lib/dom-utils/getClippingRect.js
    function getInnerBoundingClientRect(element, strategy) {
        var rect = getBoundingClientRect(element, false, strategy === "fixed");
        rect.top = rect.top + element.clientTop;
        rect.left = rect.left + element.clientLeft;
        rect.bottom = rect.top + element.clientHeight;
        rect.right = rect.left + element.clientWidth;
        rect.width = element.clientWidth;
        rect.height = element.clientHeight;
        rect.x = rect.left;
        rect.y = rect.top;
        return rect;
    }
    function getClientRectFromMixedType(element, clippingParent, strategy) {
        return clippingParent === viewport ? rectToClientRect(getViewportRect(element, strategy)) : isElement(clippingParent) ? getInnerBoundingClientRect(clippingParent, strategy) : rectToClientRect(getDocumentRect(getDocumentElement(element)));
    }
    function getClippingParents(element) {
        var clippingParents2 = listScrollParents(getParentNode(element));
        var canEscapeClipping = ["absolute", "fixed"].indexOf(getComputedStyle2(element).position) >= 0;
        var clipperElement = canEscapeClipping && isHTMLElement(element) ? getOffsetParent(element) : element;
        if (!isElement(clipperElement)) {
            return [];
        }
        return clippingParents2.filter(function(clippingParent) {
            return isElement(clippingParent) && contains(clippingParent, clipperElement) && getNodeName(clippingParent) !== "body";
        });
    }
    function getClippingRect(element, boundary, rootBoundary, strategy) {
        var mainClippingParents = boundary === "clippingParents" ? getClippingParents(element) : [].concat(boundary);
        var clippingParents2 = [].concat(mainClippingParents, [rootBoundary]);
        var firstClippingParent = clippingParents2[0];
        var clippingRect = clippingParents2.reduce(function(accRect, clippingParent) {
            var rect = getClientRectFromMixedType(element, clippingParent, strategy);
            accRect.top = max(rect.top, accRect.top);
            accRect.right = min(rect.right, accRect.right);
            accRect.bottom = min(rect.bottom, accRect.bottom);
            accRect.left = max(rect.left, accRect.left);
            return accRect;
        }, getClientRectFromMixedType(element, firstClippingParent, strategy));
        clippingRect.width = clippingRect.right - clippingRect.left;
        clippingRect.height = clippingRect.bottom - clippingRect.top;
        clippingRect.x = clippingRect.left;
        clippingRect.y = clippingRect.top;
        return clippingRect;
    }

    // node_modules/@popperjs/core/lib/utils/computeOffsets.js
    function computeOffsets(_ref) {
        var reference2 = _ref.reference, element = _ref.element, placement = _ref.placement;
        var basePlacement = placement ? getBasePlacement(placement) : null;
        var variation = placement ? getVariation(placement) : null;
        var commonX = reference2.x + reference2.width / 2 - element.width / 2;
        var commonY = reference2.y + reference2.height / 2 - element.height / 2;
        var offsets;
        switch (basePlacement) {
            case top:
                offsets = {
                    x: commonX,
                    y: reference2.y - element.height
                };
                break;
            case bottom:
                offsets = {
                    x: commonX,
                    y: reference2.y + reference2.height
                };
                break;
            case right:
                offsets = {
                    x: reference2.x + reference2.width,
                    y: commonY
                };
                break;
            case left:
                offsets = {
                    x: reference2.x - element.width,
                    y: commonY
                };
                break;
            default:
                offsets = {
                    x: reference2.x,
                    y: reference2.y
                };
        }
        var mainAxis = basePlacement ? getMainAxisFromPlacement(basePlacement) : null;
        if (mainAxis != null) {
            var len = mainAxis === "y" ? "height" : "width";
            switch (variation) {
                case start2:
                    offsets[mainAxis] = offsets[mainAxis] - (reference2[len] / 2 - element[len] / 2);
                    break;
                case end:
                    offsets[mainAxis] = offsets[mainAxis] + (reference2[len] / 2 - element[len] / 2);
                    break;
                default:
            }
        }
        return offsets;
    }

    // node_modules/@popperjs/core/lib/utils/detectOverflow.js
    function detectOverflow(state, options) {
        if (options === void 0) {
            options = {};
        }
        var _options = options, _options$placement = _options.placement, placement = _options$placement === void 0 ? state.placement : _options$placement, _options$strategy = _options.strategy, strategy = _options$strategy === void 0 ? state.strategy : _options$strategy, _options$boundary = _options.boundary, boundary = _options$boundary === void 0 ? clippingParents : _options$boundary, _options$rootBoundary = _options.rootBoundary, rootBoundary = _options$rootBoundary === void 0 ? viewport : _options$rootBoundary, _options$elementConte = _options.elementContext, elementContext = _options$elementConte === void 0 ? popper : _options$elementConte, _options$altBoundary = _options.altBoundary, altBoundary = _options$altBoundary === void 0 ? false : _options$altBoundary, _options$padding = _options.padding, padding = _options$padding === void 0 ? 0 : _options$padding;
        var paddingObject = mergePaddingObject(typeof padding !== "number" ? padding : expandToHashMap(padding, basePlacements));
        var altContext = elementContext === popper ? reference : popper;
        var popperRect = state.rects.popper;
        var element = state.elements[altBoundary ? altContext : elementContext];
        var clippingClientRect = getClippingRect(isElement(element) ? element : element.contextElement || getDocumentElement(state.elements.popper), boundary, rootBoundary, strategy);
        var referenceClientRect = getBoundingClientRect(state.elements.reference);
        var popperOffsets2 = computeOffsets({
            reference: referenceClientRect,
            element: popperRect,
            strategy: "absolute",
            placement
        });
        var popperClientRect = rectToClientRect(Object.assign({}, popperRect, popperOffsets2));
        var elementClientRect = elementContext === popper ? popperClientRect : referenceClientRect;
        var overflowOffsets = {
            top: clippingClientRect.top - elementClientRect.top + paddingObject.top,
            bottom: elementClientRect.bottom - clippingClientRect.bottom + paddingObject.bottom,
            left: clippingClientRect.left - elementClientRect.left + paddingObject.left,
            right: elementClientRect.right - clippingClientRect.right + paddingObject.right
        };
        var offsetData = state.modifiersData.offset;
        if (elementContext === popper && offsetData) {
            var offset2 = offsetData[placement];
            Object.keys(overflowOffsets).forEach(function(key) {
                var multiply = [right, bottom].indexOf(key) >= 0 ? 1 : -1;
                var axis = [top, bottom].indexOf(key) >= 0 ? "y" : "x";
                overflowOffsets[key] += offset2[axis] * multiply;
            });
        }
        return overflowOffsets;
    }

    // node_modules/@popperjs/core/lib/utils/computeAutoPlacement.js
    function computeAutoPlacement(state, options) {
        if (options === void 0) {
            options = {};
        }
        var _options = options, placement = _options.placement, boundary = _options.boundary, rootBoundary = _options.rootBoundary, padding = _options.padding, flipVariations = _options.flipVariations, _options$allowedAutoP = _options.allowedAutoPlacements, allowedAutoPlacements = _options$allowedAutoP === void 0 ? placements : _options$allowedAutoP;
        var variation = getVariation(placement);
        var placements2 = variation ? flipVariations ? variationPlacements : variationPlacements.filter(function(placement2) {
            return getVariation(placement2) === variation;
        }) : basePlacements;
        var allowedPlacements = placements2.filter(function(placement2) {
            return allowedAutoPlacements.indexOf(placement2) >= 0;
        });
        if (allowedPlacements.length === 0) {
            allowedPlacements = placements2;
        }
        var overflows = allowedPlacements.reduce(function(acc, placement2) {
            acc[placement2] = detectOverflow(state, {
                placement: placement2,
                boundary,
                rootBoundary,
                padding
            })[getBasePlacement(placement2)];
            return acc;
        }, {});
        return Object.keys(overflows).sort(function(a, b) {
            return overflows[a] - overflows[b];
        });
    }

    // node_modules/@popperjs/core/lib/modifiers/flip.js
    function getExpandedFallbackPlacements(placement) {
        if (getBasePlacement(placement) === auto) {
            return [];
        }
        var oppositePlacement = getOppositePlacement(placement);
        return [getOppositeVariationPlacement(placement), oppositePlacement, getOppositeVariationPlacement(oppositePlacement)];
    }
    function flip(_ref) {
        var state = _ref.state, options = _ref.options, name = _ref.name;
        if (state.modifiersData[name]._skip) {
            return;
        }
        var _options$mainAxis = options.mainAxis, checkMainAxis = _options$mainAxis === void 0 ? true : _options$mainAxis, _options$altAxis = options.altAxis, checkAltAxis = _options$altAxis === void 0 ? true : _options$altAxis, specifiedFallbackPlacements = options.fallbackPlacements, padding = options.padding, boundary = options.boundary, rootBoundary = options.rootBoundary, altBoundary = options.altBoundary, _options$flipVariatio = options.flipVariations, flipVariations = _options$flipVariatio === void 0 ? true : _options$flipVariatio, allowedAutoPlacements = options.allowedAutoPlacements;
        var preferredPlacement = state.options.placement;
        var basePlacement = getBasePlacement(preferredPlacement);
        var isBasePlacement = basePlacement === preferredPlacement;
        var fallbackPlacements = specifiedFallbackPlacements || (isBasePlacement || !flipVariations ? [getOppositePlacement(preferredPlacement)] : getExpandedFallbackPlacements(preferredPlacement));
        var placements2 = [preferredPlacement].concat(fallbackPlacements).reduce(function(acc, placement2) {
            return acc.concat(getBasePlacement(placement2) === auto ? computeAutoPlacement(state, {
                placement: placement2,
                boundary,
                rootBoundary,
                padding,
                flipVariations,
                allowedAutoPlacements
            }) : placement2);
        }, []);
        var referenceRect = state.rects.reference;
        var popperRect = state.rects.popper;
        var checksMap = /* @__PURE__ */ new Map();
        var makeFallbackChecks = true;
        var firstFittingPlacement = placements2[0];
        for (var i = 0; i < placements2.length; i++) {
            var placement = placements2[i];
            var _basePlacement = getBasePlacement(placement);
            var isStartVariation = getVariation(placement) === start2;
            var isVertical = [top, bottom].indexOf(_basePlacement) >= 0;
            var len = isVertical ? "width" : "height";
            var overflow = detectOverflow(state, {
                placement,
                boundary,
                rootBoundary,
                altBoundary,
                padding
            });
            var mainVariationSide = isVertical ? isStartVariation ? right : left : isStartVariation ? bottom : top;
            if (referenceRect[len] > popperRect[len]) {
                mainVariationSide = getOppositePlacement(mainVariationSide);
            }
            var altVariationSide = getOppositePlacement(mainVariationSide);
            var checks = [];
            if (checkMainAxis) {
                checks.push(overflow[_basePlacement] <= 0);
            }
            if (checkAltAxis) {
                checks.push(overflow[mainVariationSide] <= 0, overflow[altVariationSide] <= 0);
            }
            if (checks.every(function(check) {
                return check;
            })) {
                firstFittingPlacement = placement;
                makeFallbackChecks = false;
                break;
            }
            checksMap.set(placement, checks);
        }
        if (makeFallbackChecks) {
            var numberOfChecks = flipVariations ? 3 : 1;
            var _loop = function _loop2(_i2) {
                var fittingPlacement = placements2.find(function(placement2) {
                    var checks2 = checksMap.get(placement2);
                    if (checks2) {
                        return checks2.slice(0, _i2).every(function(check) {
                            return check;
                        });
                    }
                });
                if (fittingPlacement) {
                    firstFittingPlacement = fittingPlacement;
                    return "break";
                }
            };
            for (var _i = numberOfChecks; _i > 0; _i--) {
                var _ret = _loop(_i);
                if (_ret === "break")
                    break;
            }
        }
        if (state.placement !== firstFittingPlacement) {
            state.modifiersData[name]._skip = true;
            state.placement = firstFittingPlacement;
            state.reset = true;
        }
    }
    var flip_default = {
        name: "flip",
        enabled: true,
        phase: "main",
        fn: flip,
        requiresIfExists: ["offset"],
        data: {
            _skip: false
        }
    };

    // node_modules/@popperjs/core/lib/modifiers/hide.js
    function getSideOffsets(overflow, rect, preventedOffsets) {
        if (preventedOffsets === void 0) {
            preventedOffsets = {
                x: 0,
                y: 0
            };
        }
        return {
            top: overflow.top - rect.height - preventedOffsets.y,
            right: overflow.right - rect.width + preventedOffsets.x,
            bottom: overflow.bottom - rect.height + preventedOffsets.y,
            left: overflow.left - rect.width - preventedOffsets.x
        };
    }
    function isAnySideFullyClipped(overflow) {
        return [top, right, bottom, left].some(function(side) {
            return overflow[side] >= 0;
        });
    }
    function hide(_ref) {
        var state = _ref.state, name = _ref.name;
        var referenceRect = state.rects.reference;
        var popperRect = state.rects.popper;
        var preventedOffsets = state.modifiersData.preventOverflow;
        var referenceOverflow = detectOverflow(state, {
            elementContext: "reference"
        });
        var popperAltOverflow = detectOverflow(state, {
            altBoundary: true
        });
        var referenceClippingOffsets = getSideOffsets(referenceOverflow, referenceRect);
        var popperEscapeOffsets = getSideOffsets(popperAltOverflow, popperRect, preventedOffsets);
        var isReferenceHidden = isAnySideFullyClipped(referenceClippingOffsets);
        var hasPopperEscaped = isAnySideFullyClipped(popperEscapeOffsets);
        state.modifiersData[name] = {
            referenceClippingOffsets,
            popperEscapeOffsets,
            isReferenceHidden,
            hasPopperEscaped
        };
        state.attributes.popper = Object.assign({}, state.attributes.popper, {
            "data-popper-reference-hidden": isReferenceHidden,
            "data-popper-escaped": hasPopperEscaped
        });
    }
    var hide_default = {
        name: "hide",
        enabled: true,
        phase: "main",
        requiresIfExists: ["preventOverflow"],
        fn: hide
    };

    // node_modules/@popperjs/core/lib/modifiers/offset.js
    function distanceAndSkiddingToXY(placement, rects, offset2) {
        var basePlacement = getBasePlacement(placement);
        var invertDistance = [left, top].indexOf(basePlacement) >= 0 ? -1 : 1;
        var _ref = typeof offset2 === "function" ? offset2(Object.assign({}, rects, {
            placement
        })) : offset2, skidding = _ref[0], distance = _ref[1];
        skidding = skidding || 0;
        distance = (distance || 0) * invertDistance;
        return [left, right].indexOf(basePlacement) >= 0 ? {
            x: distance,
            y: skidding
        } : {
            x: skidding,
            y: distance
        };
    }
    function offset(_ref2) {
        var state = _ref2.state, options = _ref2.options, name = _ref2.name;
        var _options$offset = options.offset, offset2 = _options$offset === void 0 ? [0, 0] : _options$offset;
        var data2 = placements.reduce(function(acc, placement) {
            acc[placement] = distanceAndSkiddingToXY(placement, state.rects, offset2);
            return acc;
        }, {});
        var _data$state$placement = data2[state.placement], x = _data$state$placement.x, y = _data$state$placement.y;
        if (state.modifiersData.popperOffsets != null) {
            state.modifiersData.popperOffsets.x += x;
            state.modifiersData.popperOffsets.y += y;
        }
        state.modifiersData[name] = data2;
    }
    var offset_default = {
        name: "offset",
        enabled: true,
        phase: "main",
        requires: ["popperOffsets"],
        fn: offset
    };

    // node_modules/@popperjs/core/lib/modifiers/popperOffsets.js
    function popperOffsets(_ref) {
        var state = _ref.state, name = _ref.name;
        state.modifiersData[name] = computeOffsets({
            reference: state.rects.reference,
            element: state.rects.popper,
            strategy: "absolute",
            placement: state.placement
        });
    }
    var popperOffsets_default = {
        name: "popperOffsets",
        enabled: true,
        phase: "read",
        fn: popperOffsets,
        data: {}
    };

    // node_modules/@popperjs/core/lib/utils/getAltAxis.js
    function getAltAxis(axis) {
        return axis === "x" ? "y" : "x";
    }

    // node_modules/@popperjs/core/lib/modifiers/preventOverflow.js
    function preventOverflow(_ref) {
        var state = _ref.state, options = _ref.options, name = _ref.name;
        var _options$mainAxis = options.mainAxis, checkMainAxis = _options$mainAxis === void 0 ? true : _options$mainAxis, _options$altAxis = options.altAxis, checkAltAxis = _options$altAxis === void 0 ? false : _options$altAxis, boundary = options.boundary, rootBoundary = options.rootBoundary, altBoundary = options.altBoundary, padding = options.padding, _options$tether = options.tether, tether = _options$tether === void 0 ? true : _options$tether, _options$tetherOffset = options.tetherOffset, tetherOffset = _options$tetherOffset === void 0 ? 0 : _options$tetherOffset;
        var overflow = detectOverflow(state, {
            boundary,
            rootBoundary,
            padding,
            altBoundary
        });
        var basePlacement = getBasePlacement(state.placement);
        var variation = getVariation(state.placement);
        var isBasePlacement = !variation;
        var mainAxis = getMainAxisFromPlacement(basePlacement);
        var altAxis = getAltAxis(mainAxis);
        var popperOffsets2 = state.modifiersData.popperOffsets;
        var referenceRect = state.rects.reference;
        var popperRect = state.rects.popper;
        var tetherOffsetValue = typeof tetherOffset === "function" ? tetherOffset(Object.assign({}, state.rects, {
            placement: state.placement
        })) : tetherOffset;
        var normalizedTetherOffsetValue = typeof tetherOffsetValue === "number" ? {
            mainAxis: tetherOffsetValue,
            altAxis: tetherOffsetValue
        } : Object.assign({
            mainAxis: 0,
            altAxis: 0
        }, tetherOffsetValue);
        var offsetModifierState = state.modifiersData.offset ? state.modifiersData.offset[state.placement] : null;
        var data2 = {
            x: 0,
            y: 0
        };
        if (!popperOffsets2) {
            return;
        }
        if (checkMainAxis) {
            var _offsetModifierState$;
            var mainSide = mainAxis === "y" ? top : left;
            var altSide = mainAxis === "y" ? bottom : right;
            var len = mainAxis === "y" ? "height" : "width";
            var offset2 = popperOffsets2[mainAxis];
            var min2 = offset2 + overflow[mainSide];
            var max2 = offset2 - overflow[altSide];
            var additive = tether ? -popperRect[len] / 2 : 0;
            var minLen = variation === start2 ? referenceRect[len] : popperRect[len];
            var maxLen = variation === start2 ? -popperRect[len] : -referenceRect[len];
            var arrowElement = state.elements.arrow;
            var arrowRect = tether && arrowElement ? getLayoutRect(arrowElement) : {
                width: 0,
                height: 0
            };
            var arrowPaddingObject = state.modifiersData["arrow#persistent"] ? state.modifiersData["arrow#persistent"].padding : getFreshSideObject();
            var arrowPaddingMin = arrowPaddingObject[mainSide];
            var arrowPaddingMax = arrowPaddingObject[altSide];
            var arrowLen = within(0, referenceRect[len], arrowRect[len]);
            var minOffset = isBasePlacement ? referenceRect[len] / 2 - additive - arrowLen - arrowPaddingMin - normalizedTetherOffsetValue.mainAxis : minLen - arrowLen - arrowPaddingMin - normalizedTetherOffsetValue.mainAxis;
            var maxOffset = isBasePlacement ? -referenceRect[len] / 2 + additive + arrowLen + arrowPaddingMax + normalizedTetherOffsetValue.mainAxis : maxLen + arrowLen + arrowPaddingMax + normalizedTetherOffsetValue.mainAxis;
            var arrowOffsetParent = state.elements.arrow && getOffsetParent(state.elements.arrow);
            var clientOffset = arrowOffsetParent ? mainAxis === "y" ? arrowOffsetParent.clientTop || 0 : arrowOffsetParent.clientLeft || 0 : 0;
            var offsetModifierValue = (_offsetModifierState$ = offsetModifierState == null ? void 0 : offsetModifierState[mainAxis]) != null ? _offsetModifierState$ : 0;
            var tetherMin = offset2 + minOffset - offsetModifierValue - clientOffset;
            var tetherMax = offset2 + maxOffset - offsetModifierValue;
            var preventedOffset = within(tether ? min(min2, tetherMin) : min2, offset2, tether ? max(max2, tetherMax) : max2);
            popperOffsets2[mainAxis] = preventedOffset;
            data2[mainAxis] = preventedOffset - offset2;
        }
        if (checkAltAxis) {
            var _offsetModifierState$2;
            var _mainSide = mainAxis === "x" ? top : left;
            var _altSide = mainAxis === "x" ? bottom : right;
            var _offset = popperOffsets2[altAxis];
            var _len = altAxis === "y" ? "height" : "width";
            var _min = _offset + overflow[_mainSide];
            var _max = _offset - overflow[_altSide];
            var isOriginSide = [top, left].indexOf(basePlacement) !== -1;
            var _offsetModifierValue = (_offsetModifierState$2 = offsetModifierState == null ? void 0 : offsetModifierState[altAxis]) != null ? _offsetModifierState$2 : 0;
            var _tetherMin = isOriginSide ? _min : _offset - referenceRect[_len] - popperRect[_len] - _offsetModifierValue + normalizedTetherOffsetValue.altAxis;
            var _tetherMax = isOriginSide ? _offset + referenceRect[_len] + popperRect[_len] - _offsetModifierValue - normalizedTetherOffsetValue.altAxis : _max;
            var _preventedOffset = tether && isOriginSide ? withinMaxClamp(_tetherMin, _offset, _tetherMax) : within(tether ? _tetherMin : _min, _offset, tether ? _tetherMax : _max);
            popperOffsets2[altAxis] = _preventedOffset;
            data2[altAxis] = _preventedOffset - _offset;
        }
        state.modifiersData[name] = data2;
    }
    var preventOverflow_default = {
        name: "preventOverflow",
        enabled: true,
        phase: "main",
        fn: preventOverflow,
        requiresIfExists: ["offset"]
    };

    // node_modules/@popperjs/core/lib/dom-utils/getHTMLElementScroll.js
    function getHTMLElementScroll(element) {
        return {
            scrollLeft: element.scrollLeft,
            scrollTop: element.scrollTop
        };
    }

    // node_modules/@popperjs/core/lib/dom-utils/getNodeScroll.js
    function getNodeScroll(node) {
        if (node === getWindow(node) || !isHTMLElement(node)) {
            return getWindowScroll(node);
        } else {
            return getHTMLElementScroll(node);
        }
    }

    // node_modules/@popperjs/core/lib/dom-utils/getCompositeRect.js
    function isElementScaled(element) {
        var rect = element.getBoundingClientRect();
        var scaleX = round(rect.width) / element.offsetWidth || 1;
        var scaleY = round(rect.height) / element.offsetHeight || 1;
        return scaleX !== 1 || scaleY !== 1;
    }
    function getCompositeRect(elementOrVirtualElement, offsetParent, isFixed) {
        if (isFixed === void 0) {
            isFixed = false;
        }
        var isOffsetParentAnElement = isHTMLElement(offsetParent);
        var offsetParentIsScaled = isHTMLElement(offsetParent) && isElementScaled(offsetParent);
        var documentElement = getDocumentElement(offsetParent);
        var rect = getBoundingClientRect(elementOrVirtualElement, offsetParentIsScaled, isFixed);
        var scroll = {
            scrollLeft: 0,
            scrollTop: 0
        };
        var offsets = {
            x: 0,
            y: 0
        };
        if (isOffsetParentAnElement || !isOffsetParentAnElement && !isFixed) {
            if (getNodeName(offsetParent) !== "body" || // https://github.com/popperjs/popper-core/issues/1078
                isScrollParent(documentElement)) {
                scroll = getNodeScroll(offsetParent);
            }
            if (isHTMLElement(offsetParent)) {
                offsets = getBoundingClientRect(offsetParent, true);
                offsets.x += offsetParent.clientLeft;
                offsets.y += offsetParent.clientTop;
            } else if (documentElement) {
                offsets.x = getWindowScrollBarX(documentElement);
            }
        }
        return {
            x: rect.left + scroll.scrollLeft - offsets.x,
            y: rect.top + scroll.scrollTop - offsets.y,
            width: rect.width,
            height: rect.height
        };
    }

    // node_modules/@popperjs/core/lib/utils/orderModifiers.js
    function order(modifiers) {
        var map = /* @__PURE__ */ new Map();
        var visited = /* @__PURE__ */ new Set();
        var result = [];
        modifiers.forEach(function(modifier) {
            map.set(modifier.name, modifier);
        });
        function sort(modifier) {
            visited.add(modifier.name);
            var requires = [].concat(modifier.requires || [], modifier.requiresIfExists || []);
            requires.forEach(function(dep) {
                if (!visited.has(dep)) {
                    var depModifier = map.get(dep);
                    if (depModifier) {
                        sort(depModifier);
                    }
                }
            });
            result.push(modifier);
        }
        modifiers.forEach(function(modifier) {
            if (!visited.has(modifier.name)) {
                sort(modifier);
            }
        });
        return result;
    }
    function orderModifiers(modifiers) {
        var orderedModifiers = order(modifiers);
        return modifierPhases.reduce(function(acc, phase) {
            return acc.concat(orderedModifiers.filter(function(modifier) {
                return modifier.phase === phase;
            }));
        }, []);
    }

    // node_modules/@popperjs/core/lib/utils/debounce.js
    function debounce2(fn2) {
        var pending;
        return function() {
            if (!pending) {
                pending = new Promise(function(resolve) {
                    Promise.resolve().then(function() {
                        pending = void 0;
                        resolve(fn2());
                    });
                });
            }
            return pending;
        };
    }

    // node_modules/@popperjs/core/lib/utils/mergeByName.js
    function mergeByName(modifiers) {
        var merged = modifiers.reduce(function(merged2, current) {
            var existing = merged2[current.name];
            merged2[current.name] = existing ? Object.assign({}, existing, current, {
                options: Object.assign({}, existing.options, current.options),
                data: Object.assign({}, existing.data, current.data)
            }) : current;
            return merged2;
        }, {});
        return Object.keys(merged).map(function(key) {
            return merged[key];
        });
    }

    // node_modules/@popperjs/core/lib/createPopper.js
    var DEFAULT_OPTIONS = {
        placement: "bottom",
        modifiers: [],
        strategy: "absolute"
    };
    function areValidElements() {
        for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
            args[_key] = arguments[_key];
        }
        return !args.some(function(element) {
            return !(element && typeof element.getBoundingClientRect === "function");
        });
    }
    function popperGenerator(generatorOptions) {
        if (generatorOptions === void 0) {
            generatorOptions = {};
        }
        var _generatorOptions = generatorOptions, _generatorOptions$def = _generatorOptions.defaultModifiers, defaultModifiers2 = _generatorOptions$def === void 0 ? [] : _generatorOptions$def, _generatorOptions$def2 = _generatorOptions.defaultOptions, defaultOptions = _generatorOptions$def2 === void 0 ? DEFAULT_OPTIONS : _generatorOptions$def2;
        return function createPopper2(reference2, popper2, options) {
            if (options === void 0) {
                options = defaultOptions;
            }
            var state = {
                placement: "bottom",
                orderedModifiers: [],
                options: Object.assign({}, DEFAULT_OPTIONS, defaultOptions),
                modifiersData: {},
                elements: {
                    reference: reference2,
                    popper: popper2
                },
                attributes: {},
                styles: {}
            };
            var effectCleanupFns = [];
            var isDestroyed = false;
            var instance = {
                state,
                setOptions: function setOptions(setOptionsAction) {
                    var options2 = typeof setOptionsAction === "function" ? setOptionsAction(state.options) : setOptionsAction;
                    cleanupModifierEffects();
                    state.options = Object.assign({}, defaultOptions, state.options, options2);
                    state.scrollParents = {
                        reference: isElement(reference2) ? listScrollParents(reference2) : reference2.contextElement ? listScrollParents(reference2.contextElement) : [],
                        popper: listScrollParents(popper2)
                    };
                    var orderedModifiers = orderModifiers(mergeByName([].concat(defaultModifiers2, state.options.modifiers)));
                    state.orderedModifiers = orderedModifiers.filter(function(m) {
                        return m.enabled;
                    });
                    runModifierEffects();
                    return instance.update();
                },
                // Sync update – it will always be executed, even if not necessary. This
                // is useful for low frequency updates where sync behavior simplifies the
                // logic.
                // For high frequency updates (e.g. `resize` and `scroll` events), always
                // prefer the async Popper#update method
                forceUpdate: function forceUpdate() {
                    if (isDestroyed) {
                        return;
                    }
                    var _state$elements = state.elements, reference3 = _state$elements.reference, popper3 = _state$elements.popper;
                    if (!areValidElements(reference3, popper3)) {
                        return;
                    }
                    state.rects = {
                        reference: getCompositeRect(reference3, getOffsetParent(popper3), state.options.strategy === "fixed"),
                        popper: getLayoutRect(popper3)
                    };
                    state.reset = false;
                    state.placement = state.options.placement;
                    state.orderedModifiers.forEach(function(modifier) {
                        return state.modifiersData[modifier.name] = Object.assign({}, modifier.data);
                    });
                    for (var index = 0; index < state.orderedModifiers.length; index++) {
                        if (state.reset === true) {
                            state.reset = false;
                            index = -1;
                            continue;
                        }
                        var _state$orderedModifie = state.orderedModifiers[index], fn2 = _state$orderedModifie.fn, _state$orderedModifie2 = _state$orderedModifie.options, _options = _state$orderedModifie2 === void 0 ? {} : _state$orderedModifie2, name = _state$orderedModifie.name;
                        if (typeof fn2 === "function") {
                            state = fn2({
                                state,
                                options: _options,
                                name,
                                instance
                            }) || state;
                        }
                    }
                },
                // Async and optimistically optimized update – it will not be executed if
                // not necessary (debounced to run at most once-per-tick)
                update: debounce2(function() {
                    return new Promise(function(resolve) {
                        instance.forceUpdate();
                        resolve(state);
                    });
                }),
                destroy: function destroy() {
                    cleanupModifierEffects();
                    isDestroyed = true;
                }
            };
            if (!areValidElements(reference2, popper2)) {
                return instance;
            }
            instance.setOptions(options).then(function(state2) {
                if (!isDestroyed && options.onFirstUpdate) {
                    options.onFirstUpdate(state2);
                }
            });
            function runModifierEffects() {
                state.orderedModifiers.forEach(function(_ref) {
                    var name = _ref.name, _ref$options = _ref.options, options2 = _ref$options === void 0 ? {} : _ref$options, effect6 = _ref.effect;
                    if (typeof effect6 === "function") {
                        var cleanupFn = effect6({
                            state,
                            name,
                            instance,
                            options: options2
                        });
                        var noopFn = function noopFn2() {
                        };
                        effectCleanupFns.push(cleanupFn || noopFn);
                    }
                });
            }
            function cleanupModifierEffects() {
                effectCleanupFns.forEach(function(fn2) {
                    return fn2();
                });
                effectCleanupFns = [];
            }
            return instance;
        };
    }

    // node_modules/@popperjs/core/lib/popper.js
    var defaultModifiers = [eventListeners_default, popperOffsets_default, computeStyles_default, applyStyles_default, offset_default, flip_default, preventOverflow_default, arrow_default, hide_default];
    var createPopper = /* @__PURE__ */ popperGenerator({
        defaultModifiers
    });

    // node_modules/flowbite/lib/esm/components/dropdown/index.js
    var __assign5 = function() {
        __assign5 = Object.assign || function(t) {
            for (var s, i = 1, n = arguments.length; i < n; i++) {
                s = arguments[i];
                for (var p in s)
                    if (Object.prototype.hasOwnProperty.call(s, p))
                        t[p] = s[p];
            }
            return t;
        };
        return __assign5.apply(this, arguments);
    };
    var __spreadArray = function(to, from, pack) {
        if (pack || arguments.length === 2)
            for (var i = 0, l = from.length, ar; i < l; i++) {
                if (ar || !(i in from)) {
                    if (!ar)
                        ar = Array.prototype.slice.call(from, 0, i);
                    ar[i] = from[i];
                }
            }
        return to.concat(ar || Array.prototype.slice.call(from));
    };
    var Default5 = {
        placement: "bottom",
        triggerType: "click",
        offsetSkidding: 0,
        offsetDistance: 10,
        delay: 300,
        ignoreClickOutsideClass: false,
        onShow: function() {
        },
        onHide: function() {
        },
        onToggle: function() {
        }
    };
    var DefaultInstanceOptions5 = {
        id: null,
        override: true
    };
    var Dropdown = (
        /** @class */
        function() {
            function Dropdown2(targetElement, triggerElement, options, instanceOptions) {
                if (targetElement === void 0) {
                    targetElement = null;
                }
                if (triggerElement === void 0) {
                    triggerElement = null;
                }
                if (options === void 0) {
                    options = Default5;
                }
                if (instanceOptions === void 0) {
                    instanceOptions = DefaultInstanceOptions5;
                }
                this._instanceId = instanceOptions.id ? instanceOptions.id : targetElement.id;
                this._targetEl = targetElement;
                this._triggerEl = triggerElement;
                this._options = __assign5(__assign5({}, Default5), options);
                this._popperInstance = null;
                this._visible = false;
                this._initialized = false;
                this.init();
                instances_default.addInstance("Dropdown", this, this._instanceId, instanceOptions.override);
            }
            Dropdown2.prototype.init = function() {
                if (this._triggerEl && this._targetEl && !this._initialized) {
                    this._popperInstance = this._createPopperInstance();
                    this._setupEventListeners();
                    this._initialized = true;
                }
            };
            Dropdown2.prototype.destroy = function() {
                var _this = this;
                var triggerEvents = this._getTriggerEvents();
                if (this._options.triggerType === "click") {
                    triggerEvents.showEvents.forEach(function(ev) {
                        _this._triggerEl.removeEventListener(ev, _this._clickHandler);
                    });
                }
                if (this._options.triggerType === "hover") {
                    triggerEvents.showEvents.forEach(function(ev) {
                        _this._triggerEl.removeEventListener(ev, _this._hoverShowTriggerElHandler);
                        _this._targetEl.removeEventListener(ev, _this._hoverShowTargetElHandler);
                    });
                    triggerEvents.hideEvents.forEach(function(ev) {
                        _this._triggerEl.removeEventListener(ev, _this._hoverHideHandler);
                        _this._targetEl.removeEventListener(ev, _this._hoverHideHandler);
                    });
                }
                this._popperInstance.destroy();
                this._initialized = false;
            };
            Dropdown2.prototype.removeInstance = function() {
                instances_default.removeInstance("Dropdown", this._instanceId);
            };
            Dropdown2.prototype.destroyAndRemoveInstance = function() {
                this.destroy();
                this.removeInstance();
            };
            Dropdown2.prototype._setupEventListeners = function() {
                var _this = this;
                var triggerEvents = this._getTriggerEvents();
                this._clickHandler = function() {
                    _this.toggle();
                };
                if (this._options.triggerType === "click") {
                    triggerEvents.showEvents.forEach(function(ev) {
                        _this._triggerEl.addEventListener(ev, _this._clickHandler);
                    });
                }
                this._hoverShowTriggerElHandler = function(ev) {
                    if (ev.type === "click") {
                        _this.toggle();
                    } else {
                        setTimeout(function() {
                            _this.show();
                        }, _this._options.delay);
                    }
                };
                this._hoverShowTargetElHandler = function() {
                    _this.show();
                };
                this._hoverHideHandler = function() {
                    setTimeout(function() {
                        if (!_this._targetEl.matches(":hover")) {
                            _this.hide();
                        }
                    }, _this._options.delay);
                };
                if (this._options.triggerType === "hover") {
                    triggerEvents.showEvents.forEach(function(ev) {
                        _this._triggerEl.addEventListener(ev, _this._hoverShowTriggerElHandler);
                        _this._targetEl.addEventListener(ev, _this._hoverShowTargetElHandler);
                    });
                    triggerEvents.hideEvents.forEach(function(ev) {
                        _this._triggerEl.addEventListener(ev, _this._hoverHideHandler);
                        _this._targetEl.addEventListener(ev, _this._hoverHideHandler);
                    });
                }
            };
            Dropdown2.prototype._createPopperInstance = function() {
                return createPopper(this._triggerEl, this._targetEl, {
                    placement: this._options.placement,
                    modifiers: [
                        {
                            name: "offset",
                            options: {
                                offset: [
                                    this._options.offsetSkidding,
                                    this._options.offsetDistance
                                ]
                            }
                        }
                    ]
                });
            };
            Dropdown2.prototype._setupClickOutsideListener = function() {
                var _this = this;
                this._clickOutsideEventListener = function(ev) {
                    _this._handleClickOutside(ev, _this._targetEl);
                };
                document.body.addEventListener("click", this._clickOutsideEventListener, true);
            };
            Dropdown2.prototype._removeClickOutsideListener = function() {
                document.body.removeEventListener("click", this._clickOutsideEventListener, true);
            };
            Dropdown2.prototype._handleClickOutside = function(ev, targetEl) {
                var clickedEl = ev.target;
                var ignoreClickOutsideClass = this._options.ignoreClickOutsideClass;
                var isIgnored = false;
                if (ignoreClickOutsideClass) {
                    var ignoredClickOutsideEls = document.querySelectorAll(".".concat(ignoreClickOutsideClass));
                    ignoredClickOutsideEls.forEach(function(el) {
                        if (el.contains(clickedEl)) {
                            isIgnored = true;
                            return;
                        }
                    });
                }
                if (clickedEl !== targetEl && !targetEl.contains(clickedEl) && !this._triggerEl.contains(clickedEl) && !isIgnored && this.isVisible()) {
                    this.hide();
                }
            };
            Dropdown2.prototype._getTriggerEvents = function() {
                switch (this._options.triggerType) {
                    case "hover":
                        return {
                            showEvents: ["mouseenter", "click"],
                            hideEvents: ["mouseleave"]
                        };
                    case "click":
                        return {
                            showEvents: ["click"],
                            hideEvents: []
                        };
                    case "none":
                        return {
                            showEvents: [],
                            hideEvents: []
                        };
                    default:
                        return {
                            showEvents: ["click"],
                            hideEvents: []
                        };
                }
            };
            Dropdown2.prototype.toggle = function() {
                if (this.isVisible()) {
                    this.hide();
                } else {
                    this.show();
                }
                this._options.onToggle(this);
            };
            Dropdown2.prototype.isVisible = function() {
                return this._visible;
            };
            Dropdown2.prototype.show = function() {
                this._targetEl.classList.remove("hidden");
                this._targetEl.classList.add("block");
                this._popperInstance.setOptions(function(options) {
                    return __assign5(__assign5({}, options), { modifiers: __spreadArray(__spreadArray([], options.modifiers, true), [
                            { name: "eventListeners", enabled: true }
                        ], false) });
                });
                this._setupClickOutsideListener();
                this._popperInstance.update();
                this._visible = true;
                this._options.onShow(this);
            };
            Dropdown2.prototype.hide = function() {
                this._targetEl.classList.remove("block");
                this._targetEl.classList.add("hidden");
                this._popperInstance.setOptions(function(options) {
                    return __assign5(__assign5({}, options), { modifiers: __spreadArray(__spreadArray([], options.modifiers, true), [
                            { name: "eventListeners", enabled: false }
                        ], false) });
                });
                this._visible = false;
                this._removeClickOutsideListener();
                this._options.onHide(this);
            };
            return Dropdown2;
        }()
    );
    function initDropdowns() {
        document.querySelectorAll("[data-dropdown-toggle]").forEach(function($triggerEl) {
            var dropdownId = $triggerEl.getAttribute("data-dropdown-toggle");
            var $dropdownEl = document.getElementById(dropdownId);
            if ($dropdownEl) {
                var placement = $triggerEl.getAttribute("data-dropdown-placement");
                var offsetSkidding = $triggerEl.getAttribute("data-dropdown-offset-skidding");
                var offsetDistance = $triggerEl.getAttribute("data-dropdown-offset-distance");
                var triggerType = $triggerEl.getAttribute("data-dropdown-trigger");
                var delay = $triggerEl.getAttribute("data-dropdown-delay");
                var ignoreClickOutsideClass = $triggerEl.getAttribute("data-dropdown-ignore-click-outside-class");
                new Dropdown($dropdownEl, $triggerEl, {
                    placement: placement ? placement : Default5.placement,
                    triggerType: triggerType ? triggerType : Default5.triggerType,
                    offsetSkidding: offsetSkidding ? parseInt(offsetSkidding) : Default5.offsetSkidding,
                    offsetDistance: offsetDistance ? parseInt(offsetDistance) : Default5.offsetDistance,
                    delay: delay ? parseInt(delay) : Default5.delay,
                    ignoreClickOutsideClass: ignoreClickOutsideClass ? ignoreClickOutsideClass : Default5.ignoreClickOutsideClass
                });
            } else {
                console.error('The dropdown element with id "'.concat(dropdownId, '" does not exist. Please check the data-dropdown-toggle attribute.'));
            }
        });
    }
    if (typeof window !== "undefined") {
        window.Dropdown = Dropdown;
        window.initDropdowns = initDropdowns;
    }

    // node_modules/flowbite/lib/esm/components/modal/index.js
    var __assign6 = function() {
        __assign6 = Object.assign || function(t) {
            for (var s, i = 1, n = arguments.length; i < n; i++) {
                s = arguments[i];
                for (var p in s)
                    if (Object.prototype.hasOwnProperty.call(s, p))
                        t[p] = s[p];
            }
            return t;
        };
        return __assign6.apply(this, arguments);
    };
    var Default6 = {
        placement: "center",
        backdropClasses: "bg-gray-900/50 dark:bg-gray-900/80 fixed inset-0 z-40",
        backdrop: "dynamic",
        closable: true,
        onHide: function() {
        },
        onShow: function() {
        },
        onToggle: function() {
        }
    };
    var DefaultInstanceOptions6 = {
        id: null,
        override: true
    };
    var Modal = (
        /** @class */
        function() {
            function Modal2(targetEl, options, instanceOptions) {
                if (targetEl === void 0) {
                    targetEl = null;
                }
                if (options === void 0) {
                    options = Default6;
                }
                if (instanceOptions === void 0) {
                    instanceOptions = DefaultInstanceOptions6;
                }
                this._eventListenerInstances = [];
                this._instanceId = instanceOptions.id ? instanceOptions.id : targetEl.id;
                this._targetEl = targetEl;
                this._options = __assign6(__assign6({}, Default6), options);
                this._isHidden = true;
                this._backdropEl = null;
                this._initialized = false;
                this.init();
                instances_default.addInstance("Modal", this, this._instanceId, instanceOptions.override);
            }
            Modal2.prototype.init = function() {
                var _this = this;
                if (this._targetEl && !this._initialized) {
                    this._getPlacementClasses().map(function(c) {
                        _this._targetEl.classList.add(c);
                    });
                    this._initialized = true;
                }
            };
            Modal2.prototype.destroy = function() {
                if (this._initialized) {
                    this.removeAllEventListenerInstances();
                    this._destroyBackdropEl();
                    this._initialized = false;
                }
            };
            Modal2.prototype.removeInstance = function() {
                instances_default.removeInstance("Modal", this._instanceId);
            };
            Modal2.prototype.destroyAndRemoveInstance = function() {
                this.destroy();
                this.removeInstance();
            };
            Modal2.prototype._createBackdrop = function() {
                var _a;
                if (this._isHidden) {
                    var backdropEl = document.createElement("div");
                    backdropEl.setAttribute("modal-backdrop", "");
                    (_a = backdropEl.classList).add.apply(_a, this._options.backdropClasses.split(" "));
                    document.querySelector("body").append(backdropEl);
                    this._backdropEl = backdropEl;
                }
            };
            Modal2.prototype._destroyBackdropEl = function() {
                if (!this._isHidden) {
                    document.querySelector("[modal-backdrop]").remove();
                }
            };
            Modal2.prototype._setupModalCloseEventListeners = function() {
                var _this = this;
                if (this._options.backdrop === "dynamic") {
                    this._clickOutsideEventListener = function(ev) {
                        _this._handleOutsideClick(ev.target);
                    };
                    this._targetEl.addEventListener("click", this._clickOutsideEventListener, true);
                }
                this._keydownEventListener = function(ev) {
                    if (ev.key === "Escape") {
                        _this.hide();
                    }
                };
                document.body.addEventListener("keydown", this._keydownEventListener, true);
            };
            Modal2.prototype._removeModalCloseEventListeners = function() {
                if (this._options.backdrop === "dynamic") {
                    this._targetEl.removeEventListener("click", this._clickOutsideEventListener, true);
                }
                document.body.removeEventListener("keydown", this._keydownEventListener, true);
            };
            Modal2.prototype._handleOutsideClick = function(target) {
                if (target === this._targetEl || target === this._backdropEl && this.isVisible()) {
                    this.hide();
                }
            };
            Modal2.prototype._getPlacementClasses = function() {
                switch (this._options.placement) {
                    case "top-left":
                        return ["justify-start", "items-start"];
                    case "top-center":
                        return ["justify-center", "items-start"];
                    case "top-right":
                        return ["justify-end", "items-start"];
                    case "center-left":
                        return ["justify-start", "items-center"];
                    case "center":
                        return ["justify-center", "items-center"];
                    case "center-right":
                        return ["justify-end", "items-center"];
                    case "bottom-left":
                        return ["justify-start", "items-end"];
                    case "bottom-center":
                        return ["justify-center", "items-end"];
                    case "bottom-right":
                        return ["justify-end", "items-end"];
                    default:
                        return ["justify-center", "items-center"];
                }
            };
            Modal2.prototype.toggle = function() {
                if (this._isHidden) {
                    this.show();
                } else {
                    this.hide();
                }
                this._options.onToggle(this);
            };
            Modal2.prototype.show = function() {
                if (this.isHidden) {
                    this._targetEl.classList.add("flex");
                    this._targetEl.classList.remove("hidden");
                    this._targetEl.setAttribute("aria-modal", "true");
                    this._targetEl.setAttribute("role", "dialog");
                    this._targetEl.removeAttribute("aria-hidden");
                    this._createBackdrop();
                    this._isHidden = false;
                    if (this._options.closable) {
                        this._setupModalCloseEventListeners();
                    }
                    document.body.classList.add("overflow-hidden");
                    this._options.onShow(this);
                }
            };
            Modal2.prototype.hide = function() {
                if (this.isVisible) {
                    this._targetEl.classList.add("hidden");
                    this._targetEl.classList.remove("flex");
                    this._targetEl.setAttribute("aria-hidden", "true");
                    this._targetEl.removeAttribute("aria-modal");
                    this._targetEl.removeAttribute("role");
                    this._destroyBackdropEl();
                    this._isHidden = true;
                    document.body.classList.remove("overflow-hidden");
                    if (this._options.closable) {
                        this._removeModalCloseEventListeners();
                    }
                    this._options.onHide(this);
                }
            };
            Modal2.prototype.isVisible = function() {
                return !this._isHidden;
            };
            Modal2.prototype.isHidden = function() {
                return this._isHidden;
            };
            Modal2.prototype.addEventListenerInstance = function(element, type, handler4) {
                this._eventListenerInstances.push({
                    element,
                    type,
                    handler: handler4
                });
            };
            Modal2.prototype.removeAllEventListenerInstances = function() {
                this._eventListenerInstances.map(function(eventListenerInstance) {
                    eventListenerInstance.element.removeEventListener(eventListenerInstance.type, eventListenerInstance.handler);
                });
                this._eventListenerInstances = [];
            };
            Modal2.prototype.getAllEventListenerInstances = function() {
                return this._eventListenerInstances;
            };
            return Modal2;
        }()
    );
    function initModals() {
        document.querySelectorAll("[data-modal-target]").forEach(function($triggerEl) {
            var modalId = $triggerEl.getAttribute("data-modal-target");
            var $modalEl = document.getElementById(modalId);
            if ($modalEl) {
                var placement = $modalEl.getAttribute("data-modal-placement");
                var backdrop = $modalEl.getAttribute("data-modal-backdrop");
                new Modal($modalEl, {
                    placement: placement ? placement : Default6.placement,
                    backdrop: backdrop ? backdrop : Default6.backdrop
                });
            } else {
                console.error("Modal with id ".concat(modalId, " does not exist. Are you sure that the data-modal-target attribute points to the correct modal id?."));
            }
        });
        document.querySelectorAll("[data-modal-toggle]").forEach(function($triggerEl) {
            var modalId = $triggerEl.getAttribute("data-modal-toggle");
            var $modalEl = document.getElementById(modalId);
            if ($modalEl) {
                var modal_1 = instances_default.getInstance("Modal", modalId);
                if (modal_1) {
                    var toggleModal = function() {
                        modal_1.toggle();
                    };
                    $triggerEl.addEventListener("click", toggleModal);
                    modal_1.addEventListenerInstance($triggerEl, "click", toggleModal);
                } else {
                    console.error("Modal with id ".concat(modalId, " has not been initialized. Please initialize it using the data-modal-target attribute."));
                }
            } else {
                console.error("Modal with id ".concat(modalId, " does not exist. Are you sure that the data-modal-toggle attribute points to the correct modal id?"));
            }
        });
        document.querySelectorAll("[data-modal-show]").forEach(function($triggerEl) {
            var modalId = $triggerEl.getAttribute("data-modal-show");
            var $modalEl = document.getElementById(modalId);
            if ($modalEl) {
                var modal_2 = instances_default.getInstance("Modal", modalId);
                if (modal_2) {
                    var showModal = function() {
                        modal_2.show();
                    };
                    $triggerEl.addEventListener("click", showModal);
                    modal_2.addEventListenerInstance($triggerEl, "click", showModal);
                } else {
                    console.error("Modal with id ".concat(modalId, " has not been initialized. Please initialize it using the data-modal-target attribute."));
                }
            } else {
                console.error("Modal with id ".concat(modalId, " does not exist. Are you sure that the data-modal-show attribute points to the correct modal id?"));
            }
        });
        document.querySelectorAll("[data-modal-hide]").forEach(function($triggerEl) {
            var modalId = $triggerEl.getAttribute("data-modal-hide");
            var $modalEl = document.getElementById(modalId);
            if ($modalEl) {
                var modal_3 = instances_default.getInstance("Modal", modalId);
                if (modal_3) {
                    var hideModal = function() {
                        modal_3.hide();
                    };
                    $triggerEl.addEventListener("click", hideModal);
                    modal_3.addEventListenerInstance($triggerEl, "click", hideModal);
                } else {
                    console.error("Modal with id ".concat(modalId, " has not been initialized. Please initialize it using the data-modal-target attribute."));
                }
            } else {
                console.error("Modal with id ".concat(modalId, " does not exist. Are you sure that the data-modal-hide attribute points to the correct modal id?"));
            }
        });
    }
    if (typeof window !== "undefined") {
        window.Modal = Modal;
        window.initModals = initModals;
    }

    // node_modules/flowbite/lib/esm/components/drawer/index.js
    var __assign7 = function() {
        __assign7 = Object.assign || function(t) {
            for (var s, i = 1, n = arguments.length; i < n; i++) {
                s = arguments[i];
                for (var p in s)
                    if (Object.prototype.hasOwnProperty.call(s, p))
                        t[p] = s[p];
            }
            return t;
        };
        return __assign7.apply(this, arguments);
    };
    var Default7 = {
        placement: "left",
        bodyScrolling: false,
        backdrop: true,
        edge: false,
        edgeOffset: "bottom-[60px]",
        backdropClasses: "bg-gray-900/50 dark:bg-gray-900/80 fixed inset-0 z-30",
        onShow: function() {
        },
        onHide: function() {
        },
        onToggle: function() {
        }
    };
    var DefaultInstanceOptions7 = {
        id: null,
        override: true
    };
    var Drawer = (
        /** @class */
        function() {
            function Drawer2(targetEl, options, instanceOptions) {
                if (targetEl === void 0) {
                    targetEl = null;
                }
                if (options === void 0) {
                    options = Default7;
                }
                if (instanceOptions === void 0) {
                    instanceOptions = DefaultInstanceOptions7;
                }
                this._eventListenerInstances = [];
                this._instanceId = instanceOptions.id ? instanceOptions.id : targetEl.id;
                this._targetEl = targetEl;
                this._options = __assign7(__assign7({}, Default7), options);
                this._visible = false;
                this._initialized = false;
                this.init();
                instances_default.addInstance("Drawer", this, this._instanceId, instanceOptions.override);
            }
            Drawer2.prototype.init = function() {
                var _this = this;
                if (this._targetEl && !this._initialized) {
                    this._targetEl.setAttribute("aria-hidden", "true");
                    this._targetEl.classList.add("transition-transform");
                    this._getPlacementClasses(this._options.placement).base.map(function(c) {
                        _this._targetEl.classList.add(c);
                    });
                    this._handleEscapeKey = function(event) {
                        if (event.key === "Escape") {
                            if (_this.isVisible()) {
                                _this.hide();
                            }
                        }
                    };
                    document.addEventListener("keydown", this._handleEscapeKey);
                    this._initialized = true;
                }
            };
            Drawer2.prototype.destroy = function() {
                if (this._initialized) {
                    this.removeAllEventListenerInstances();
                    this._destroyBackdropEl();
                    document.removeEventListener("keydown", this._handleEscapeKey);
                    this._initialized = false;
                }
            };
            Drawer2.prototype.removeInstance = function() {
                instances_default.removeInstance("Drawer", this._instanceId);
            };
            Drawer2.prototype.destroyAndRemoveInstance = function() {
                this.destroy();
                this.removeInstance();
            };
            Drawer2.prototype.hide = function() {
                var _this = this;
                if (this._options.edge) {
                    this._getPlacementClasses(this._options.placement + "-edge").active.map(function(c) {
                        _this._targetEl.classList.remove(c);
                    });
                    this._getPlacementClasses(this._options.placement + "-edge").inactive.map(function(c) {
                        _this._targetEl.classList.add(c);
                    });
                } else {
                    this._getPlacementClasses(this._options.placement).active.map(function(c) {
                        _this._targetEl.classList.remove(c);
                    });
                    this._getPlacementClasses(this._options.placement).inactive.map(function(c) {
                        _this._targetEl.classList.add(c);
                    });
                }
                this._targetEl.setAttribute("aria-hidden", "true");
                this._targetEl.removeAttribute("aria-modal");
                this._targetEl.removeAttribute("role");
                if (!this._options.bodyScrolling) {
                    document.body.classList.remove("overflow-hidden");
                }
                if (this._options.backdrop) {
                    this._destroyBackdropEl();
                }
                this._visible = false;
                this._options.onHide(this);
            };
            Drawer2.prototype.show = function() {
                var _this = this;
                if (this._options.edge) {
                    this._getPlacementClasses(this._options.placement + "-edge").active.map(function(c) {
                        _this._targetEl.classList.add(c);
                    });
                    this._getPlacementClasses(this._options.placement + "-edge").inactive.map(function(c) {
                        _this._targetEl.classList.remove(c);
                    });
                } else {
                    this._getPlacementClasses(this._options.placement).active.map(function(c) {
                        _this._targetEl.classList.add(c);
                    });
                    this._getPlacementClasses(this._options.placement).inactive.map(function(c) {
                        _this._targetEl.classList.remove(c);
                    });
                }
                this._targetEl.setAttribute("aria-modal", "true");
                this._targetEl.setAttribute("role", "dialog");
                this._targetEl.removeAttribute("aria-hidden");
                if (!this._options.bodyScrolling) {
                    document.body.classList.add("overflow-hidden");
                }
                if (this._options.backdrop) {
                    this._createBackdrop();
                }
                this._visible = true;
                this._options.onShow(this);
            };
            Drawer2.prototype.toggle = function() {
                if (this.isVisible()) {
                    this.hide();
                } else {
                    this.show();
                }
            };
            Drawer2.prototype._createBackdrop = function() {
                var _a;
                var _this = this;
                if (!this._visible) {
                    var backdropEl = document.createElement("div");
                    backdropEl.setAttribute("drawer-backdrop", "");
                    (_a = backdropEl.classList).add.apply(_a, this._options.backdropClasses.split(" "));
                    document.querySelector("body").append(backdropEl);
                    backdropEl.addEventListener("click", function() {
                        _this.hide();
                    });
                }
            };
            Drawer2.prototype._destroyBackdropEl = function() {
                if (this._visible) {
                    document.querySelector("[drawer-backdrop]").remove();
                }
            };
            Drawer2.prototype._getPlacementClasses = function(placement) {
                switch (placement) {
                    case "top":
                        return {
                            base: ["top-0", "left-0", "right-0"],
                            active: ["transform-none"],
                            inactive: ["-translate-y-full"]
                        };
                    case "right":
                        return {
                            base: ["right-0", "top-0"],
                            active: ["transform-none"],
                            inactive: ["translate-x-full"]
                        };
                    case "bottom":
                        return {
                            base: ["bottom-0", "left-0", "right-0"],
                            active: ["transform-none"],
                            inactive: ["translate-y-full"]
                        };
                    case "left":
                        return {
                            base: ["left-0", "top-0"],
                            active: ["transform-none"],
                            inactive: ["-translate-x-full"]
                        };
                    case "bottom-edge":
                        return {
                            base: ["left-0", "top-0"],
                            active: ["transform-none"],
                            inactive: ["translate-y-full", this._options.edgeOffset]
                        };
                    default:
                        return {
                            base: ["left-0", "top-0"],
                            active: ["transform-none"],
                            inactive: ["-translate-x-full"]
                        };
                }
            };
            Drawer2.prototype.isHidden = function() {
                return !this._visible;
            };
            Drawer2.prototype.isVisible = function() {
                return this._visible;
            };
            Drawer2.prototype.addEventListenerInstance = function(element, type, handler4) {
                this._eventListenerInstances.push({
                    element,
                    type,
                    handler: handler4
                });
            };
            Drawer2.prototype.removeAllEventListenerInstances = function() {
                this._eventListenerInstances.map(function(eventListenerInstance) {
                    eventListenerInstance.element.removeEventListener(eventListenerInstance.type, eventListenerInstance.handler);
                });
                this._eventListenerInstances = [];
            };
            Drawer2.prototype.getAllEventListenerInstances = function() {
                return this._eventListenerInstances;
            };
            return Drawer2;
        }()
    );
    function initDrawers() {
        document.querySelectorAll("[data-drawer-target]").forEach(function($triggerEl) {
            var drawerId = $triggerEl.getAttribute("data-drawer-target");
            var $drawerEl = document.getElementById(drawerId);
            if ($drawerEl) {
                var placement = $triggerEl.getAttribute("data-drawer-placement");
                var bodyScrolling = $triggerEl.getAttribute("data-drawer-body-scrolling");
                var backdrop = $triggerEl.getAttribute("data-drawer-backdrop");
                var edge = $triggerEl.getAttribute("data-drawer-edge");
                var edgeOffset = $triggerEl.getAttribute("data-drawer-edge-offset");
                new Drawer($drawerEl, {
                    placement: placement ? placement : Default7.placement,
                    bodyScrolling: bodyScrolling ? bodyScrolling === "true" ? true : false : Default7.bodyScrolling,
                    backdrop: backdrop ? backdrop === "true" ? true : false : Default7.backdrop,
                    edge: edge ? edge === "true" ? true : false : Default7.edge,
                    edgeOffset: edgeOffset ? edgeOffset : Default7.edgeOffset
                });
            } else {
                console.error("Drawer with id ".concat(drawerId, " not found. Are you sure that the data-drawer-target attribute points to the correct drawer id?"));
            }
        });
        document.querySelectorAll("[data-drawer-toggle]").forEach(function($triggerEl) {
            var drawerId = $triggerEl.getAttribute("data-drawer-toggle");
            var $drawerEl = document.getElementById(drawerId);
            if ($drawerEl) {
                var drawer_1 = instances_default.getInstance("Drawer", drawerId);
                if (drawer_1) {
                    var toggleDrawer = function() {
                        drawer_1.toggle();
                    };
                    $triggerEl.addEventListener("click", toggleDrawer);
                    drawer_1.addEventListenerInstance($triggerEl, "click", toggleDrawer);
                } else {
                    console.error("Drawer with id ".concat(drawerId, " has not been initialized. Please initialize it using the data-drawer-target attribute."));
                }
            } else {
                console.error("Drawer with id ".concat(drawerId, " not found. Are you sure that the data-drawer-target attribute points to the correct drawer id?"));
            }
        });
        document.querySelectorAll("[data-drawer-dismiss], [data-drawer-hide]").forEach(function($triggerEl) {
            var drawerId = $triggerEl.getAttribute("data-drawer-dismiss") ? $triggerEl.getAttribute("data-drawer-dismiss") : $triggerEl.getAttribute("data-drawer-hide");
            var $drawerEl = document.getElementById(drawerId);
            if ($drawerEl) {
                var drawer_2 = instances_default.getInstance("Drawer", drawerId);
                if (drawer_2) {
                    var hideDrawer = function() {
                        drawer_2.hide();
                    };
                    $triggerEl.addEventListener("click", hideDrawer);
                    drawer_2.addEventListenerInstance($triggerEl, "click", hideDrawer);
                } else {
                    console.error("Drawer with id ".concat(drawerId, " has not been initialized. Please initialize it using the data-drawer-target attribute."));
                }
            } else {
                console.error("Drawer with id ".concat(drawerId, " not found. Are you sure that the data-drawer-target attribute points to the correct drawer id"));
            }
        });
        document.querySelectorAll("[data-drawer-show]").forEach(function($triggerEl) {
            var drawerId = $triggerEl.getAttribute("data-drawer-show");
            var $drawerEl = document.getElementById(drawerId);
            if ($drawerEl) {
                var drawer_3 = instances_default.getInstance("Drawer", drawerId);
                if (drawer_3) {
                    var showDrawer = function() {
                        drawer_3.show();
                    };
                    $triggerEl.addEventListener("click", showDrawer);
                    drawer_3.addEventListenerInstance($triggerEl, "click", showDrawer);
                } else {
                    console.error("Drawer with id ".concat(drawerId, " has not been initialized. Please initialize it using the data-drawer-target attribute."));
                }
            } else {
                console.error("Drawer with id ".concat(drawerId, " not found. Are you sure that the data-drawer-target attribute points to the correct drawer id?"));
            }
        });
    }
    if (typeof window !== "undefined") {
        window.Drawer = Drawer;
        window.initDrawers = initDrawers;
    }

    // node_modules/flowbite/lib/esm/components/tabs/index.js
    var __assign8 = function() {
        __assign8 = Object.assign || function(t) {
            for (var s, i = 1, n = arguments.length; i < n; i++) {
                s = arguments[i];
                for (var p in s)
                    if (Object.prototype.hasOwnProperty.call(s, p))
                        t[p] = s[p];
            }
            return t;
        };
        return __assign8.apply(this, arguments);
    };
    var Default8 = {
        defaultTabId: null,
        activeClasses: "text-blue-600 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-500 border-blue-600 dark:border-blue-500",
        inactiveClasses: "dark:border-transparent text-gray-500 hover:text-gray-600 dark:text-gray-400 border-gray-100 hover:border-gray-300 dark:border-gray-700 dark:hover:text-gray-300",
        onShow: function() {
        }
    };
    var DefaultInstanceOptions8 = {
        id: null,
        override: true
    };
    var Tabs = (
        /** @class */
        function() {
            function Tabs2(tabsEl, items, options, instanceOptions) {
                if (tabsEl === void 0) {
                    tabsEl = null;
                }
                if (items === void 0) {
                    items = [];
                }
                if (options === void 0) {
                    options = Default8;
                }
                if (instanceOptions === void 0) {
                    instanceOptions = DefaultInstanceOptions8;
                }
                this._instanceId = instanceOptions.id ? instanceOptions.id : tabsEl.id;
                this._tabsEl = tabsEl;
                this._items = items;
                this._activeTab = options ? this.getTab(options.defaultTabId) : null;
                this._options = __assign8(__assign8({}, Default8), options);
                this._initialized = false;
                this.init();
                instances_default.addInstance("Tabs", this, this._tabsEl.id, true);
                instances_default.addInstance("Tabs", this, this._instanceId, instanceOptions.override);
            }
            Tabs2.prototype.init = function() {
                var _this = this;
                if (this._items.length && !this._initialized) {
                    if (!this._activeTab) {
                        this.setActiveTab(this._items[0]);
                    }
                    this.show(this._activeTab.id, true);
                    this._items.map(function(tab) {
                        tab.triggerEl.addEventListener("click", function() {
                            _this.show(tab.id);
                        });
                    });
                }
            };
            Tabs2.prototype.destroy = function() {
                if (this._initialized) {
                    this._initialized = false;
                }
            };
            Tabs2.prototype.removeInstance = function() {
                this.destroy();
                instances_default.removeInstance("Tabs", this._instanceId);
            };
            Tabs2.prototype.destroyAndRemoveInstance = function() {
                this.destroy();
                this.removeInstance();
            };
            Tabs2.prototype.getActiveTab = function() {
                return this._activeTab;
            };
            Tabs2.prototype.setActiveTab = function(tab) {
                this._activeTab = tab;
            };
            Tabs2.prototype.getTab = function(id) {
                return this._items.filter(function(t) {
                    return t.id === id;
                })[0];
            };
            Tabs2.prototype.show = function(id, forceShow) {
                var _a, _b;
                var _this = this;
                if (forceShow === void 0) {
                    forceShow = false;
                }
                var tab = this.getTab(id);
                if (tab === this._activeTab && !forceShow) {
                    return;
                }
                this._items.map(function(t) {
                    var _a2, _b2;
                    if (t !== tab) {
                        (_a2 = t.triggerEl.classList).remove.apply(_a2, _this._options.activeClasses.split(" "));
                        (_b2 = t.triggerEl.classList).add.apply(_b2, _this._options.inactiveClasses.split(" "));
                        t.targetEl.classList.add("hidden");
                        t.triggerEl.setAttribute("aria-selected", "false");
                    }
                });
                (_a = tab.triggerEl.classList).add.apply(_a, this._options.activeClasses.split(" "));
                (_b = tab.triggerEl.classList).remove.apply(_b, this._options.inactiveClasses.split(" "));
                tab.triggerEl.setAttribute("aria-selected", "true");
                tab.targetEl.classList.remove("hidden");
                this.setActiveTab(tab);
                this._options.onShow(this, tab);
            };
            return Tabs2;
        }()
    );
    function initTabs() {
        document.querySelectorAll("[data-tabs-toggle]").forEach(function($parentEl) {
            var tabItems = [];
            var defaultTabId = null;
            $parentEl.querySelectorAll('[role="tab"]').forEach(function($triggerEl) {
                var isActive = $triggerEl.getAttribute("aria-selected") === "true";
                var tab = {
                    id: $triggerEl.getAttribute("data-tabs-target"),
                    triggerEl: $triggerEl,
                    targetEl: document.querySelector($triggerEl.getAttribute("data-tabs-target"))
                };
                tabItems.push(tab);
                if (isActive) {
                    defaultTabId = tab.id;
                }
            });
            new Tabs($parentEl, tabItems, {
                defaultTabId
            });
        });
    }
    if (typeof window !== "undefined") {
        window.Tabs = Tabs;
        window.initTabs = initTabs;
    }

    // node_modules/flowbite/lib/esm/components/tooltip/index.js
    var __assign9 = function() {
        __assign9 = Object.assign || function(t) {
            for (var s, i = 1, n = arguments.length; i < n; i++) {
                s = arguments[i];
                for (var p in s)
                    if (Object.prototype.hasOwnProperty.call(s, p))
                        t[p] = s[p];
            }
            return t;
        };
        return __assign9.apply(this, arguments);
    };
    var __spreadArray2 = function(to, from, pack) {
        if (pack || arguments.length === 2)
            for (var i = 0, l = from.length, ar; i < l; i++) {
                if (ar || !(i in from)) {
                    if (!ar)
                        ar = Array.prototype.slice.call(from, 0, i);
                    ar[i] = from[i];
                }
            }
        return to.concat(ar || Array.prototype.slice.call(from));
    };
    var Default9 = {
        placement: "top",
        triggerType: "hover",
        onShow: function() {
        },
        onHide: function() {
        },
        onToggle: function() {
        }
    };
    var DefaultInstanceOptions9 = {
        id: null,
        override: true
    };
    var Tooltip = (
        /** @class */
        function() {
            function Tooltip2(targetEl, triggerEl, options, instanceOptions) {
                if (targetEl === void 0) {
                    targetEl = null;
                }
                if (triggerEl === void 0) {
                    triggerEl = null;
                }
                if (options === void 0) {
                    options = Default9;
                }
                if (instanceOptions === void 0) {
                    instanceOptions = DefaultInstanceOptions9;
                }
                this._instanceId = instanceOptions.id ? instanceOptions.id : targetEl.id;
                this._targetEl = targetEl;
                this._triggerEl = triggerEl;
                this._options = __assign9(__assign9({}, Default9), options);
                this._popperInstance = null;
                this._visible = false;
                this._initialized = false;
                this.init();
                instances_default.addInstance("Tooltip", this, this._instanceId, instanceOptions.override);
            }
            Tooltip2.prototype.init = function() {
                if (this._triggerEl && this._targetEl && !this._initialized) {
                    this._setupEventListeners();
                    this._popperInstance = this._createPopperInstance();
                    this._initialized = true;
                }
            };
            Tooltip2.prototype.destroy = function() {
                var _this = this;
                if (this._initialized) {
                    var triggerEvents = this._getTriggerEvents();
                    triggerEvents.showEvents.forEach(function(ev) {
                        _this._triggerEl.removeEventListener(ev, _this._showHandler);
                    });
                    triggerEvents.hideEvents.forEach(function(ev) {
                        _this._triggerEl.removeEventListener(ev, _this._hideHandler);
                    });
                    this._removeKeydownListener();
                    this._removeClickOutsideListener();
                    if (this._popperInstance) {
                        this._popperInstance.destroy();
                    }
                    this._initialized = false;
                }
            };
            Tooltip2.prototype.removeInstance = function() {
                instances_default.removeInstance("Tooltip", this._instanceId);
            };
            Tooltip2.prototype.destroyAndRemoveInstance = function() {
                this.destroy();
                this.removeInstance();
            };
            Tooltip2.prototype._setupEventListeners = function() {
                var _this = this;
                var triggerEvents = this._getTriggerEvents();
                this._showHandler = function() {
                    _this.show();
                };
                this._hideHandler = function() {
                    _this.hide();
                };
                triggerEvents.showEvents.forEach(function(ev) {
                    _this._triggerEl.addEventListener(ev, _this._showHandler);
                });
                triggerEvents.hideEvents.forEach(function(ev) {
                    _this._triggerEl.addEventListener(ev, _this._hideHandler);
                });
            };
            Tooltip2.prototype._createPopperInstance = function() {
                return createPopper(this._triggerEl, this._targetEl, {
                    placement: this._options.placement,
                    modifiers: [
                        {
                            name: "offset",
                            options: {
                                offset: [0, 8]
                            }
                        }
                    ]
                });
            };
            Tooltip2.prototype._getTriggerEvents = function() {
                switch (this._options.triggerType) {
                    case "hover":
                        return {
                            showEvents: ["mouseenter", "focus"],
                            hideEvents: ["mouseleave", "blur"]
                        };
                    case "click":
                        return {
                            showEvents: ["click", "focus"],
                            hideEvents: ["focusout", "blur"]
                        };
                    case "none":
                        return {
                            showEvents: [],
                            hideEvents: []
                        };
                    default:
                        return {
                            showEvents: ["mouseenter", "focus"],
                            hideEvents: ["mouseleave", "blur"]
                        };
                }
            };
            Tooltip2.prototype._setupKeydownListener = function() {
                var _this = this;
                this._keydownEventListener = function(ev) {
                    if (ev.key === "Escape") {
                        _this.hide();
                    }
                };
                document.body.addEventListener("keydown", this._keydownEventListener, true);
            };
            Tooltip2.prototype._removeKeydownListener = function() {
                document.body.removeEventListener("keydown", this._keydownEventListener, true);
            };
            Tooltip2.prototype._setupClickOutsideListener = function() {
                var _this = this;
                this._clickOutsideEventListener = function(ev) {
                    _this._handleClickOutside(ev, _this._targetEl);
                };
                document.body.addEventListener("click", this._clickOutsideEventListener, true);
            };
            Tooltip2.prototype._removeClickOutsideListener = function() {
                document.body.removeEventListener("click", this._clickOutsideEventListener, true);
            };
            Tooltip2.prototype._handleClickOutside = function(ev, targetEl) {
                var clickedEl = ev.target;
                if (clickedEl !== targetEl && !targetEl.contains(clickedEl) && !this._triggerEl.contains(clickedEl) && this.isVisible()) {
                    this.hide();
                }
            };
            Tooltip2.prototype.isVisible = function() {
                return this._visible;
            };
            Tooltip2.prototype.toggle = function() {
                if (this.isVisible()) {
                    this.hide();
                } else {
                    this.show();
                }
            };
            Tooltip2.prototype.show = function() {
                this._targetEl.classList.remove("opacity-0", "invisible");
                this._targetEl.classList.add("opacity-100", "visible");
                this._popperInstance.setOptions(function(options) {
                    return __assign9(__assign9({}, options), { modifiers: __spreadArray2(__spreadArray2([], options.modifiers, true), [
                            { name: "eventListeners", enabled: true }
                        ], false) });
                });
                this._setupClickOutsideListener();
                this._setupKeydownListener();
                this._popperInstance.update();
                this._visible = true;
                this._options.onShow(this);
            };
            Tooltip2.prototype.hide = function() {
                this._targetEl.classList.remove("opacity-100", "visible");
                this._targetEl.classList.add("opacity-0", "invisible");
                this._popperInstance.setOptions(function(options) {
                    return __assign9(__assign9({}, options), { modifiers: __spreadArray2(__spreadArray2([], options.modifiers, true), [
                            { name: "eventListeners", enabled: false }
                        ], false) });
                });
                this._removeClickOutsideListener();
                this._removeKeydownListener();
                this._visible = false;
                this._options.onHide(this);
            };
            return Tooltip2;
        }()
    );
    function initTooltips() {
        document.querySelectorAll("[data-tooltip-target]").forEach(function($triggerEl) {
            var tooltipId = $triggerEl.getAttribute("data-tooltip-target");
            var $tooltipEl = document.getElementById(tooltipId);
            if ($tooltipEl) {
                var triggerType = $triggerEl.getAttribute("data-tooltip-trigger");
                var placement = $triggerEl.getAttribute("data-tooltip-placement");
                new Tooltip($tooltipEl, $triggerEl, {
                    placement: placement ? placement : Default9.placement,
                    triggerType: triggerType ? triggerType : Default9.triggerType
                });
            } else {
                console.error('The tooltip element with id "'.concat(tooltipId, '" does not exist. Please check the data-tooltip-target attribute.'));
            }
        });
    }
    if (typeof window !== "undefined") {
        window.Tooltip = Tooltip;
        window.initTooltips = initTooltips;
    }

    // node_modules/flowbite/lib/esm/components/popover/index.js
    var __assign10 = function() {
        __assign10 = Object.assign || function(t) {
            for (var s, i = 1, n = arguments.length; i < n; i++) {
                s = arguments[i];
                for (var p in s)
                    if (Object.prototype.hasOwnProperty.call(s, p))
                        t[p] = s[p];
            }
            return t;
        };
        return __assign10.apply(this, arguments);
    };
    var __spreadArray3 = function(to, from, pack) {
        if (pack || arguments.length === 2)
            for (var i = 0, l = from.length, ar; i < l; i++) {
                if (ar || !(i in from)) {
                    if (!ar)
                        ar = Array.prototype.slice.call(from, 0, i);
                    ar[i] = from[i];
                }
            }
        return to.concat(ar || Array.prototype.slice.call(from));
    };
    var Default10 = {
        placement: "top",
        offset: 10,
        triggerType: "hover",
        onShow: function() {
        },
        onHide: function() {
        },
        onToggle: function() {
        }
    };
    var DefaultInstanceOptions10 = {
        id: null,
        override: true
    };
    var Popover = (
        /** @class */
        function() {
            function Popover2(targetEl, triggerEl, options, instanceOptions) {
                if (targetEl === void 0) {
                    targetEl = null;
                }
                if (triggerEl === void 0) {
                    triggerEl = null;
                }
                if (options === void 0) {
                    options = Default10;
                }
                if (instanceOptions === void 0) {
                    instanceOptions = DefaultInstanceOptions10;
                }
                this._instanceId = instanceOptions.id ? instanceOptions.id : targetEl.id;
                this._targetEl = targetEl;
                this._triggerEl = triggerEl;
                this._options = __assign10(__assign10({}, Default10), options);
                this._popperInstance = null;
                this._visible = false;
                this._initialized = false;
                this.init();
                instances_default.addInstance("Popover", this, instanceOptions.id ? instanceOptions.id : this._targetEl.id, instanceOptions.override);
            }
            Popover2.prototype.init = function() {
                if (this._triggerEl && this._targetEl && !this._initialized) {
                    this._setupEventListeners();
                    this._popperInstance = this._createPopperInstance();
                    this._initialized = true;
                }
            };
            Popover2.prototype.destroy = function() {
                var _this = this;
                if (this._initialized) {
                    var triggerEvents = this._getTriggerEvents();
                    triggerEvents.showEvents.forEach(function(ev) {
                        _this._triggerEl.removeEventListener(ev, _this._showHandler);
                        _this._targetEl.removeEventListener(ev, _this._showHandler);
                    });
                    triggerEvents.hideEvents.forEach(function(ev) {
                        _this._triggerEl.removeEventListener(ev, _this._hideHandler);
                        _this._targetEl.removeEventListener(ev, _this._hideHandler);
                    });
                    this._removeKeydownListener();
                    this._removeClickOutsideListener();
                    if (this._popperInstance) {
                        this._popperInstance.destroy();
                    }
                    this._initialized = false;
                }
            };
            Popover2.prototype.removeInstance = function() {
                instances_default.removeInstance("Popover", this._instanceId);
            };
            Popover2.prototype.destroyAndRemoveInstance = function() {
                this.destroy();
                this.removeInstance();
            };
            Popover2.prototype._setupEventListeners = function() {
                var _this = this;
                var triggerEvents = this._getTriggerEvents();
                this._showHandler = function() {
                    _this.show();
                };
                this._hideHandler = function() {
                    setTimeout(function() {
                        if (!_this._targetEl.matches(":hover")) {
                            _this.hide();
                        }
                    }, 100);
                };
                triggerEvents.showEvents.forEach(function(ev) {
                    _this._triggerEl.addEventListener(ev, _this._showHandler);
                    _this._targetEl.addEventListener(ev, _this._showHandler);
                });
                triggerEvents.hideEvents.forEach(function(ev) {
                    _this._triggerEl.addEventListener(ev, _this._hideHandler);
                    _this._targetEl.addEventListener(ev, _this._hideHandler);
                });
            };
            Popover2.prototype._createPopperInstance = function() {
                return createPopper(this._triggerEl, this._targetEl, {
                    placement: this._options.placement,
                    modifiers: [
                        {
                            name: "offset",
                            options: {
                                offset: [0, this._options.offset]
                            }
                        }
                    ]
                });
            };
            Popover2.prototype._getTriggerEvents = function() {
                switch (this._options.triggerType) {
                    case "hover":
                        return {
                            showEvents: ["mouseenter", "focus"],
                            hideEvents: ["mouseleave", "blur"]
                        };
                    case "click":
                        return {
                            showEvents: ["click", "focus"],
                            hideEvents: ["focusout", "blur"]
                        };
                    case "none":
                        return {
                            showEvents: [],
                            hideEvents: []
                        };
                    default:
                        return {
                            showEvents: ["mouseenter", "focus"],
                            hideEvents: ["mouseleave", "blur"]
                        };
                }
            };
            Popover2.prototype._setupKeydownListener = function() {
                var _this = this;
                this._keydownEventListener = function(ev) {
                    if (ev.key === "Escape") {
                        _this.hide();
                    }
                };
                document.body.addEventListener("keydown", this._keydownEventListener, true);
            };
            Popover2.prototype._removeKeydownListener = function() {
                document.body.removeEventListener("keydown", this._keydownEventListener, true);
            };
            Popover2.prototype._setupClickOutsideListener = function() {
                var _this = this;
                this._clickOutsideEventListener = function(ev) {
                    _this._handleClickOutside(ev, _this._targetEl);
                };
                document.body.addEventListener("click", this._clickOutsideEventListener, true);
            };
            Popover2.prototype._removeClickOutsideListener = function() {
                document.body.removeEventListener("click", this._clickOutsideEventListener, true);
            };
            Popover2.prototype._handleClickOutside = function(ev, targetEl) {
                var clickedEl = ev.target;
                if (clickedEl !== targetEl && !targetEl.contains(clickedEl) && !this._triggerEl.contains(clickedEl) && this.isVisible()) {
                    this.hide();
                }
            };
            Popover2.prototype.isVisible = function() {
                return this._visible;
            };
            Popover2.prototype.toggle = function() {
                if (this.isVisible()) {
                    this.hide();
                } else {
                    this.show();
                }
                this._options.onToggle(this);
            };
            Popover2.prototype.show = function() {
                this._targetEl.classList.remove("opacity-0", "invisible");
                this._targetEl.classList.add("opacity-100", "visible");
                this._popperInstance.setOptions(function(options) {
                    return __assign10(__assign10({}, options), { modifiers: __spreadArray3(__spreadArray3([], options.modifiers, true), [
                            { name: "eventListeners", enabled: true }
                        ], false) });
                });
                this._setupClickOutsideListener();
                this._setupKeydownListener();
                this._popperInstance.update();
                this._visible = true;
                this._options.onShow(this);
            };
            Popover2.prototype.hide = function() {
                this._targetEl.classList.remove("opacity-100", "visible");
                this._targetEl.classList.add("opacity-0", "invisible");
                this._popperInstance.setOptions(function(options) {
                    return __assign10(__assign10({}, options), { modifiers: __spreadArray3(__spreadArray3([], options.modifiers, true), [
                            { name: "eventListeners", enabled: false }
                        ], false) });
                });
                this._removeClickOutsideListener();
                this._removeKeydownListener();
                this._visible = false;
                this._options.onHide(this);
            };
            return Popover2;
        }()
    );
    function initPopovers() {
        document.querySelectorAll("[data-popover-target]").forEach(function($triggerEl) {
            var popoverID = $triggerEl.getAttribute("data-popover-target");
            var $popoverEl = document.getElementById(popoverID);
            if ($popoverEl) {
                var triggerType = $triggerEl.getAttribute("data-popover-trigger");
                var placement = $triggerEl.getAttribute("data-popover-placement");
                var offset2 = $triggerEl.getAttribute("data-popover-offset");
                new Popover($popoverEl, $triggerEl, {
                    placement: placement ? placement : Default10.placement,
                    offset: offset2 ? parseInt(offset2) : Default10.offset,
                    triggerType: triggerType ? triggerType : Default10.triggerType
                });
            } else {
                console.error('The popover element with id "'.concat(popoverID, '" does not exist. Please check the data-popover-target attribute.'));
            }
        });
    }
    if (typeof window !== "undefined") {
        window.Popover = Popover;
        window.initPopovers = initPopovers;
    }

    // node_modules/flowbite/lib/esm/components/dial/index.js
    var __assign11 = function() {
        __assign11 = Object.assign || function(t) {
            for (var s, i = 1, n = arguments.length; i < n; i++) {
                s = arguments[i];
                for (var p in s)
                    if (Object.prototype.hasOwnProperty.call(s, p))
                        t[p] = s[p];
            }
            return t;
        };
        return __assign11.apply(this, arguments);
    };
    var Default11 = {
        triggerType: "hover",
        onShow: function() {
        },
        onHide: function() {
        },
        onToggle: function() {
        }
    };
    var DefaultInstanceOptions11 = {
        id: null,
        override: true
    };
    var Dial = (
        /** @class */
        function() {
            function Dial2(parentEl, triggerEl, targetEl, options, instanceOptions) {
                if (parentEl === void 0) {
                    parentEl = null;
                }
                if (triggerEl === void 0) {
                    triggerEl = null;
                }
                if (targetEl === void 0) {
                    targetEl = null;
                }
                if (options === void 0) {
                    options = Default11;
                }
                if (instanceOptions === void 0) {
                    instanceOptions = DefaultInstanceOptions11;
                }
                this._instanceId = instanceOptions.id ? instanceOptions.id : targetEl.id;
                this._parentEl = parentEl;
                this._triggerEl = triggerEl;
                this._targetEl = targetEl;
                this._options = __assign11(__assign11({}, Default11), options);
                this._visible = false;
                this._initialized = false;
                this.init();
                instances_default.addInstance("Dial", this, this._instanceId, instanceOptions.override);
            }
            Dial2.prototype.init = function() {
                var _this = this;
                if (this._triggerEl && this._targetEl && !this._initialized) {
                    var triggerEventTypes = this._getTriggerEventTypes(this._options.triggerType);
                    this._showEventHandler = function() {
                        _this.show();
                    };
                    triggerEventTypes.showEvents.forEach(function(ev) {
                        _this._triggerEl.addEventListener(ev, _this._showEventHandler);
                        _this._targetEl.addEventListener(ev, _this._showEventHandler);
                    });
                    this._hideEventHandler = function() {
                        if (!_this._parentEl.matches(":hover")) {
                            _this.hide();
                        }
                    };
                    triggerEventTypes.hideEvents.forEach(function(ev) {
                        _this._parentEl.addEventListener(ev, _this._hideEventHandler);
                    });
                    this._initialized = true;
                }
            };
            Dial2.prototype.destroy = function() {
                var _this = this;
                if (this._initialized) {
                    var triggerEventTypes = this._getTriggerEventTypes(this._options.triggerType);
                    triggerEventTypes.showEvents.forEach(function(ev) {
                        _this._triggerEl.removeEventListener(ev, _this._showEventHandler);
                        _this._targetEl.removeEventListener(ev, _this._showEventHandler);
                    });
                    triggerEventTypes.hideEvents.forEach(function(ev) {
                        _this._parentEl.removeEventListener(ev, _this._hideEventHandler);
                    });
                    this._initialized = false;
                }
            };
            Dial2.prototype.removeInstance = function() {
                instances_default.removeInstance("Dial", this._instanceId);
            };
            Dial2.prototype.destroyAndRemoveInstance = function() {
                this.destroy();
                this.removeInstance();
            };
            Dial2.prototype.hide = function() {
                this._targetEl.classList.add("hidden");
                if (this._triggerEl) {
                    this._triggerEl.setAttribute("aria-expanded", "false");
                }
                this._visible = false;
                this._options.onHide(this);
            };
            Dial2.prototype.show = function() {
                this._targetEl.classList.remove("hidden");
                if (this._triggerEl) {
                    this._triggerEl.setAttribute("aria-expanded", "true");
                }
                this._visible = true;
                this._options.onShow(this);
            };
            Dial2.prototype.toggle = function() {
                if (this._visible) {
                    this.hide();
                } else {
                    this.show();
                }
            };
            Dial2.prototype.isHidden = function() {
                return !this._visible;
            };
            Dial2.prototype.isVisible = function() {
                return this._visible;
            };
            Dial2.prototype._getTriggerEventTypes = function(triggerType) {
                switch (triggerType) {
                    case "hover":
                        return {
                            showEvents: ["mouseenter", "focus"],
                            hideEvents: ["mouseleave", "blur"]
                        };
                    case "click":
                        return {
                            showEvents: ["click", "focus"],
                            hideEvents: ["focusout", "blur"]
                        };
                    case "none":
                        return {
                            showEvents: [],
                            hideEvents: []
                        };
                    default:
                        return {
                            showEvents: ["mouseenter", "focus"],
                            hideEvents: ["mouseleave", "blur"]
                        };
                }
            };
            return Dial2;
        }()
    );
    function initDials() {
        document.querySelectorAll("[data-dial-init]").forEach(function($parentEl) {
            var $triggerEl = $parentEl.querySelector("[data-dial-toggle]");
            if ($triggerEl) {
                var dialId = $triggerEl.getAttribute("data-dial-toggle");
                var $dialEl = document.getElementById(dialId);
                if ($dialEl) {
                    var triggerType = $triggerEl.getAttribute("data-dial-trigger");
                    new Dial($parentEl, $triggerEl, $dialEl, {
                        triggerType: triggerType ? triggerType : Default11.triggerType
                    });
                } else {
                    console.error("Dial with id ".concat(dialId, " does not exist. Are you sure that the data-dial-toggle attribute points to the correct modal id?"));
                }
            } else {
                console.error("Dial with id ".concat($parentEl.id, " does not have a trigger element. Are you sure that the data-dial-toggle attribute exists?"));
            }
        });
    }
    if (typeof window !== "undefined") {
        window.Dial = Dial;
        window.initDials = initDials;
    }

    // node_modules/flowbite/lib/esm/components/input-counter/index.js
    var __assign12 = function() {
        __assign12 = Object.assign || function(t) {
            for (var s, i = 1, n = arguments.length; i < n; i++) {
                s = arguments[i];
                for (var p in s)
                    if (Object.prototype.hasOwnProperty.call(s, p))
                        t[p] = s[p];
            }
            return t;
        };
        return __assign12.apply(this, arguments);
    };
    var Default12 = {
        minValue: null,
        maxValue: null,
        onIncrement: function() {
        },
        onDecrement: function() {
        }
    };
    var DefaultInstanceOptions12 = {
        id: null,
        override: true
    };
    var InputCounter = (
        /** @class */
        function() {
            function InputCounter2(targetEl, incrementEl, decrementEl, options, instanceOptions) {
                if (targetEl === void 0) {
                    targetEl = null;
                }
                if (incrementEl === void 0) {
                    incrementEl = null;
                }
                if (decrementEl === void 0) {
                    decrementEl = null;
                }
                if (options === void 0) {
                    options = Default12;
                }
                if (instanceOptions === void 0) {
                    instanceOptions = DefaultInstanceOptions12;
                }
                this._instanceId = instanceOptions.id ? instanceOptions.id : targetEl.id;
                this._targetEl = targetEl;
                this._incrementEl = incrementEl;
                this._decrementEl = decrementEl;
                this._options = __assign12(__assign12({}, Default12), options);
                this._initialized = false;
                this.init();
                instances_default.addInstance("InputCounter", this, this._instanceId, instanceOptions.override);
            }
            InputCounter2.prototype.init = function() {
                var _this = this;
                if (this._targetEl && !this._initialized) {
                    this._inputHandler = function(event) {
                        {
                            var target = event.target;
                            if (!/^\d*$/.test(target.value)) {
                                target.value = target.value.replace(/[^\d]/g, "");
                            }
                            if (_this._options.maxValue !== null && parseInt(target.value) > _this._options.maxValue) {
                                target.value = _this._options.maxValue.toString();
                            }
                            if (_this._options.minValue !== null && parseInt(target.value) < _this._options.minValue) {
                                target.value = _this._options.minValue.toString();
                            }
                        }
                    };
                    this._incrementClickHandler = function() {
                        _this.increment();
                    };
                    this._decrementClickHandler = function() {
                        _this.decrement();
                    };
                    this._targetEl.addEventListener("input", this._inputHandler);
                    if (this._incrementEl) {
                        this._incrementEl.addEventListener("click", this._incrementClickHandler);
                    }
                    if (this._decrementEl) {
                        this._decrementEl.addEventListener("click", this._decrementClickHandler);
                    }
                    this._initialized = true;
                }
            };
            InputCounter2.prototype.destroy = function() {
                if (this._targetEl && this._initialized) {
                    this._targetEl.removeEventListener("input", this._inputHandler);
                    if (this._incrementEl) {
                        this._incrementEl.removeEventListener("click", this._incrementClickHandler);
                    }
                    if (this._decrementEl) {
                        this._decrementEl.removeEventListener("click", this._decrementClickHandler);
                    }
                    this._initialized = false;
                }
            };
            InputCounter2.prototype.removeInstance = function() {
                instances_default.removeInstance("InputCounter", this._instanceId);
            };
            InputCounter2.prototype.destroyAndRemoveInstance = function() {
                this.destroy();
                this.removeInstance();
            };
            InputCounter2.prototype.getCurrentValue = function() {
                return parseInt(this._targetEl.value) || 0;
            };
            InputCounter2.prototype.increment = function() {
                if (this._options.maxValue !== null && this.getCurrentValue() >= this._options.maxValue) {
                    return;
                }
                this._targetEl.value = (this.getCurrentValue() + 1).toString();
                this._options.onIncrement(this);
            };
            InputCounter2.prototype.decrement = function() {
                if (this._options.minValue !== null && this.getCurrentValue() <= this._options.minValue) {
                    return;
                }
                this._targetEl.value = (this.getCurrentValue() - 1).toString();
                this._options.onDecrement(this);
            };
            return InputCounter2;
        }()
    );
    function initInputCounters() {
        document.querySelectorAll("[data-input-counter]").forEach(function($targetEl) {
            var targetId = $targetEl.id;
            var $incrementEl = document.querySelector('[data-input-counter-increment="' + targetId + '"]');
            var $decrementEl = document.querySelector('[data-input-counter-decrement="' + targetId + '"]');
            var minValue = $targetEl.getAttribute("data-input-counter-min");
            var maxValue = $targetEl.getAttribute("data-input-counter-max");
            if ($targetEl) {
                if (!instances_default.instanceExists("InputCounter", $targetEl.getAttribute("id"))) {
                    new InputCounter($targetEl, $incrementEl ? $incrementEl : null, $decrementEl ? $decrementEl : null, {
                        minValue: minValue ? parseInt(minValue) : null,
                        maxValue: maxValue ? parseInt(maxValue) : null
                    });
                }
            } else {
                console.error('The target element with id "'.concat(targetId, '" does not exist. Please check the data-input-counter attribute.'));
            }
        });
    }
    if (typeof window !== "undefined") {
        window.InputCounter = InputCounter;
        window.initInputCounters = initInputCounters;
    }

    // node_modules/flowbite/lib/esm/components/index.js
    function initFlowbite() {
        initAccordions();
        initCollapses();
        initCarousels();
        initDismisses();
        initDropdowns();
        initModals();
        initDrawers();
        initTabs();
        initTooltips();
        initPopovers();
        initDials();
        initInputCounters();
    }
    if (typeof window !== "undefined") {
        window.initFlowbite = initFlowbite;
    }

    // node_modules/flowbite/lib/esm/index.js
    var events = new events_default("load", [
        initAccordions,
        initCollapses,
        initCarousels,
        initDismisses,
        initDropdowns,
        initModals,
        initDrawers,
        initTabs,
        initTooltips,
        initPopovers,
        initDials,
        initInputCounters
    ]);
    events.init();

    // index.js
    window.Alpine = module_default;
    module_default.start();
    document.addEventListener("DOMContentLoaded", function() {
        document.querySelectorAll("#auto-detect-modal button").forEach((button) => {
            button.addEventListener("click", function() {
                document.getElementById("localip").value = this.getAttribute("data-value");
            });
        });

        const copyBtn = document.querySelector('#deactive-link');
        copyBtn.addEventListener('click', () => {
            const copyBtn = document.querySelector('#deactive-link');
            const homeUrl = copyBtn.textContent;

            const fileName = 'Deactive-link-local2ip.txt';

            const blob = new Blob([homeUrl], { type: 'text/plain' });

            const downloadLink = document.createElement('a');
            downloadLink.href = window.URL.createObjectURL(blob);
            downloadLink.download = fileName;

            downloadLink.click();

            setTimeout(() => {
                document.body.removeChild(downloadLink);
            }, 1000);

        });

    });

})();
