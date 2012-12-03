function Position(x, y)
{
  this.X = x;
  this.Y = y;

  this.Add = function(val)
  {
    var newPos = new Position(this.X, this.Y);
    if(val != null)
    {
      if(!isNaN(val.X))
        newPos.X += val.X;
      if(!isNaN(val.Y))
        newPos.Y += val.Y
    }
    return newPos;
  }

  this.Subtract = function(val)
  {
    var newPos = new Position(this.X, this.Y);
    if(val != null)
    {
      if(!isNaN(val.X))
        newPos.X -= val.X;
      if(!isNaN(val.Y))
        newPos.Y -= val.Y
    }
    return newPos;
  }

  this.Min = function(val)
  {
    var newPos = new Position(this.X, this.Y)
    if(val == null)
      return newPos;

    if(!isNaN(val.X) && this.X > val.X)
      newPos.X = val.X;
    if(!isNaN(val.Y) && this.Y > val.Y)
      newPos.Y = val.Y;

    return newPos;
  }

  this.Max = function(val)
  {
    var newPos = new Position(this.X, this.Y)
    if(val == null)
      return newPos;

    if(!isNaN(val.X) && this.X < val.X)
      newPos.X = val.X;
    if(!isNaN(val.Y) && this.Y < val.Y)
      newPos.Y = val.Y;

    return newPos;
  }

  this.Bound = function(lower, upper)
  {
    var newPos = this.Max(lower);
    return newPos.Min(upper);
  }

  this.Check = function()
  {
    var newPos = new Position(this.X, this.Y);
    if(isNaN(newPos.X))
      newPos.X = 0;
    if(isNaN(newPos.Y))
      newPos.Y = 0;
    return newPos;
  }

  this.Apply = function(element)
  {
    if(typeof(element) == "string")
      element = document.getElementById(element);
    if(element == null)
      return;
    if(!isNaN(this.X))
      element.style.left = this.X + 'px';
    if(!isNaN(this.Y))
      element.style.top = this.Y + 'px';
  }
}

function hookEvent(element, eventName, callback)
{
  if(typeof(element) == "string")
    element = document.getElementById(element);
  if(element == null)
    return;
  if(element.addEventListener)
  {
    element.addEventListener(eventName, callback, false);
  }
  else if(element.attachEvent)
    element.attachEvent("on" + eventName, callback);
}

function unhookEvent(element, eventName, callback)
{
  if(typeof(element) == "string")
    element = document.getElementById(element);
  if(element == null)
    return;
  if(element.removeEventListener)
    element.removeEventListener(eventName, callback, false);
  else if(element.detachEvent)
    element.detachEvent("on" + eventName, callback);
}

function cancelEvent(e)
{
  e = e ? e : window.event;
  if(e.stopPropagation)
    e.stopPropagation();
  if(e.preventDefault)
    e.preventDefault();
  e.cancelBubble = true;
  e.cancel = true;
  e.returnValue = false;
  return false;
}

function getEventTarget(e)
{
  e = e ? e : window.event;
  return e.target ? e.target : e.srcElement;
}

function absoluteCursorPostion(eventObj)
{
  eventObj = eventObj ? eventObj : window.event;

  if(isNaN(window.scrollX))
    return new Position(eventObj.clientX + document.documentElement.scrollLeft + document.body.scrollLeft,
      eventObj.clientY + document.documentElement.scrollTop + document.body.scrollTop);
  else
    return new Position(eventObj.clientX + window.scrollX, eventObj.clientY + window.scrollY);
}

function dragObject(element, attachElement, lowerBound, upperBound, startCallback, moveCallback, endCallback, attachLater)
{
  if(typeof(element) == "string")
    element = document.getElementById(element);
  if(element == null)
      return;

  var cursorStartPos = null;
  var elementStartPos = null;
  var dragging = false;
  var listening = false;
  var disposed = false;

  function dragStart(eventObj)
  {
    if(dragging || !listening || disposed) return;
    dragging = true;

    if(startCallback != null)
      startCallback(eventObj, element);

    cursorStartPos = absoluteCursorPostion(eventObj);

    elementStartPos = new Position(parseInt(element.style.left), parseInt(element.style.top));

    elementStartPos = elementStartPos.Check();

    hookEvent(document, "mousemove", dragGo);
    hookEvent(document, "mouseup", dragStopHook);

    return cancelEvent(eventObj);
  }

  function dragGo(eventObj)
  {
    if(!dragging || disposed) return;

    var newPos = absoluteCursorPostion(eventObj);
    newPos = newPos.Add(elementStartPos).Subtract(cursorStartPos);
    newPos = newPos.Bound(lowerBound, upperBound)
    newPos.Apply(element);
    if(moveCallback != null)
      moveCallback(newPos, element);

    return cancelEvent(eventObj);
  }

  function dragStopHook(eventObj)
  {
    dragStop();
    return cancelEvent(eventObj);
  }

  function dragStop()
  {
    if(!dragging || disposed) return;
    unhookEvent(document, "mousemove", dragGo);
    unhookEvent(document, "mouseup", dragStopHook);
    cursorStartPos = null;
    elementStartPos = null;
    if(endCallback != null)
      endCallback(element);
    dragging = false;
  }

  this.Dispose = function()
  {
    if(disposed) return;
    this.StopListening(true);
    element = null;
    attachElement = null
    lowerBound = null;
    upperBound = null;
    startCallback = null;
    moveCallback = null
    endCallback = null;
    disposed = true;
  }

  this.StartListening = function()
  {
    if(listening || disposed) return;
    listening = true;
    hookEvent(attachElement, "mousedown", dragStart);
  }

  this.StopListening = function(stopCurrentDragging)
  {
    if(!listening || disposed) return;
    unhookEvent(attachElement, "mousedown", dragStart);
    listening = false;

    if(stopCurrentDragging && dragging)
      dragStop();
  }

  this.IsDragging = function(){ return dragging; }
  this.IsListening = function() { return listening; }
  this.IsDisposed = function() { return disposed; }

  if(typeof(attachElement) == "string")
    attachElement = document.getElementById(attachElement);
  if(attachElement == null)
    attachElement = element;

  if(!attachLater)
    this.StartListening();
}

function getMousePos(eventObj)
{
  eventObj = eventObj ? eventObj : window.event;
  var pos;
  if(isNaN(eventObj.layerX))
    return new Position(eventObj.offsetX, eventObj.offsetY);
  else
    return new Position(eventObj.layerX, eventObj.layerY);
}

function Trackbar(min, max, width, callback, name)
{ 
  var _minimumVal = min;
  var _maximumVal = max;
  var _width = width;
  var _callback = callback;
  var _currentValue =  (0.5 * (_maximumVal - _minimumVal)) + _minimumVal;
  var _name = name;
  
  var _container = document.createElement("DIV");
  _container.style.position = 'relative';
  _container.style.height = '17px';
  _container.style.width = _width + 'px';
  _container.style.fontSize = '1px';
  
  var _leftCap = document.createElement("DIV");
  _leftCap.style.backgroundImage = 'url(images/leftCap_1x4.jpg)';
  _leftCap.style.position = 'absolute';
  _leftCap.style.height = '4px';
  _leftCap.style.width = '1px';
  _leftCap.style.left = '0px';
  _leftCap.style.top = '7px';
  
  var _bar = document.createElement("DIV");
  _bar.style.backgroundImage = 'url(images/repeater_1x4.jpg)';
  _bar.style.position = 'absolute';
  _bar.style.height = '4px';
  _bar.style.width = (_width - 3) + 'px';
  _bar.style.left = '1px';
  _bar.style.top = '7px';
  
  var _rightCap = document.createElement("DIV");
  _rightCap.style.backgroundImage = 'url(images/rightCap_2x4.jpg)';
  _rightCap.style.position = 'absolute';
  _rightCap.style.height = '4px';
  _rightCap.style.width = '2px';
  _rightCap.style.left = (_width-2) + 'px';
  _rightCap.style.top = '7px';
  
  
  var _pointer = document.createElement("DIV");
  _pointer.style.backgroundImage = 'url(images/pointer_9x17.gif)';
  _pointer.style.position = 'absolute';
  _pointer.style.height = '17px';
  _pointer.style.width = '9px';
  _pointer.style.top = '0px';
  
  _container.appendChild(_leftCap);
  _container.appendChild(_bar);
  _container.appendChild(_rightCap);
  _container.appendChild(_pointer);
  
  var _pointerLB = new Position(-4, 0);
  var _pointerUB = new Position(_width-4, 0);
  
  var _pointerDrag = new dragObject(_pointer, _container, _pointerLB, _pointerUB, OnDragBegin, OnDrag, null, true);
  
  UpdatePointerPos();
  
  function OnDragBegin(eventObj, element)
  {
    var pos = getMousePos(eventObj);

    var target = getEventTarget(eventObj);
    if(target == _pointer)
      pos.X += parseInt(_pointer.style.left);
    else if(target == _rightCap)
      pos.X += _width-1;

    pos.X -= 4;

    pos = pos.Bound(_pointerLB, _pointerUB);

    pos.Apply(_pointer);

    OnDrag(pos);
  }
  
  function OnDrag(newPos, element)
  {
    newPos.X += 4;
    _currentValue = Math.round(1000 * (((newPos.X/_width) * (_maximumVal - _minimumVal)) + _minimumVal))/1000;
    if(_callback != null)
      _callback(_currentValue, _name);
  }
  
  function UpdatePointerPos()
  {
    if(_currentValue < _minimumVal)
      _currentValue = _minimumVal;
    if(_currentValue > _maximumVal)
      _currentValue = _maximumVal;
    
    if(_maximumVal != _minimumVal)
      _pointer.style.left = (((_currentValue -  _minimumVal) / (_maximumVal - _minimumVal)) * _width - 4) + 'px';
    else
      _pointer.style.left = '0px';
  }
  
  this.GetMaxValue = function()
  { return _maximumVal; }
  
  this.GetMinValue = function()
  { return _minimumVal; }
  
  this.GetCurrentValue = function()
  { return _currentValue; }
  
  this.GetWidth = function()
  { return _width; }
   
  this.SetMaxValue = function(value)
  {
     value = parseFloat(value);
     if(isNaN(value))
       value = 1;
     _maximumVal = value;
     
    UpdatePointerPos(); 
  }
  
  this.SetMinValue = function(value)
  {
     value = parseFloat(value);
     if(isNaN(value))
       value = 0;
     _minimumVal = value;
     
    UpdatePointerPos(); 
  }
  
  this.SetCurrentValue = function(value)
  {
    value = parseFloat(value);
    if(isNaN(value))
      value = 0;
    _currentValue = value;
    
    UpdatePointerPos();
  }
  
  this.SetWidth = function(value)
  {
    value = parseInt(value);
    if(isNaN(value))
      value = 100;
    if(value < 15)
      value = 15;
    
    _width = value;
    
    _bar.style.width = (_width - 3) + 'px';
    _rightCap.style.left = (_width-2) + 'px';
    _pointerUB.X = _width-4;
    _container.style.width = _width + 'px';
    UpdatePointerPos();
  }
  
  this.GetContainer = function()
  { return _container; }
  
  this.SetCallback = function(newCallback)
  { _callback = newCallback; }
  
  this.StartListening = function()
  { _pointerDrag.StartListening(); }
  
  this.StopListening = function()
  { _pointerDrag.StopListening(); }
}
