
--[[ FLOXGUI FINAL
✓ Fly/NoClip mit Stopp + Speed Eingabe
✓ ESP mit 10 Farben
✓ GUI verschiebbar, minimierbar, Hinweis unten rechts
]]

local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local UIS = game:GetService("UserInputService")
local LP = Players.LocalPlayer
local Camera = workspace.CurrentCamera

local states = {
    esp = false,
    fly = false,
    noclip = false,
    airjump = false,
    espColor = Color3.fromRGB(255, 0, 0),
    flySpeed = 2,
    noclipSpeed = 2,
    minimized = false
}

local espBoxes = {}
local espColors = {
    Color3.fromRGB(255, 0, 0), Color3.fromRGB(0, 255, 0), Color3.fromRGB(0, 0, 255),
    Color3.fromRGB(255, 255, 0), Color3.fromRGB(255, 0, 255), Color3.fromRGB(0, 255, 255),
    Color3.fromRGB(255, 127, 80), Color3.fromRGB(128, 0, 128), Color3.fromRGB(0, 128, 128),
    Color3.fromRGB(192, 192, 192)
}
local colorIndex = 1

local gui = Instance.new("ScreenGui", game.CoreGui)
gui.Name = "FLOXGUI_FINAL"

local frame = Instance.new("Frame", gui)
frame.Size = UDim2.new(0, 440, 0, 400)
frame.Position = UDim2.new(0.5, -220, 0.5, -200)
frame.BackgroundColor3 = Color3.fromRGB(30, 30, 30)
frame.BorderSizePixel = 0
frame.Active = true
frame.Draggable = true
Instance.new("UICorner", frame).CornerRadius = UDim.new(0, 12)

local hint = Instance.new("TextLabel", gui)
hint.Size = UDim2.new(0, 160, 0, 40)
hint.Position = UDim2.new(1, -170, 1, -90)
hint.BackgroundColor3 = Color3.fromRGB(40, 40, 40)
hint.Text = "Press K to open"
hint.TextColor3 = Color3.fromRGB(255, 255, 255)
hint.TextSize = 14
hint.Font = Enum.Font.GothamBold
hint.BackgroundTransparency = 0.1
hint.Visible = false
Instance.new("UICorner", hint).CornerRadius = UDim.new(0, 10)

UIS.InputBegan:Connect(function(input, gpe)
    if gpe then return end
    if input.KeyCode == Enum.KeyCode.K then
        if states.minimized then
            frame.Visible = true
            hint.Visible = false
            states.minimized = false
        end
    end
end)

local function makeButton(text, pos, callback)
    local btn = Instance.new("TextButton", frame)
    btn.Size = UDim2.new(0, 400, 0, 30)
    btn.Position = UDim2.new(0, 20, 0, pos)
    btn.Text = text
    btn.BackgroundColor3 = Color3.fromRGB(200, 50, 50)
    btn.TextColor3 = Color3.new(1, 1, 1)
    btn.Font = Enum.Font.GothamBold
    btn.TextSize = 14
    Instance.new("UICorner", btn).CornerRadius = UDim.new(0, 6)
    btn.MouseButton1Click:Connect(function() callback(btn) end)
end

local function makeInput(labelText, pos, default, callback)
    local label = Instance.new("TextLabel", frame)
    label.Text = labelText
    label.Size = UDim2.new(0, 150, 0, 25)
    label.Position = UDim2.new(0, 20, 0, pos)
    label.BackgroundTransparency = 1
    label.TextColor3 = Color3.new(1,1,1)
    label.Font = Enum.Font.Gotham
    label.TextSize = 14

    local box = Instance.new("TextBox", frame)
    box.Text = tostring(default)
    box.Size = UDim2.new(0, 100, 0, 25)
    box.Position = UDim2.new(0, 180, 0, pos)
    box.BackgroundColor3 = Color3.fromRGB(50, 50, 50)
    box.TextColor3 = Color3.new(1,1,1)
    box.Font = Enum.Font.Gotham
    box.TextSize = 14
    Instance.new("UICorner", box).CornerRadius = UDim.new(0, 6)

    box.FocusLost:Connect(function()
        local val = tonumber(box.Text)
        if val then callback(val) end
    end)
end

makeButton("ESP [ON/OFF]", 40, function(btn)
    states.esp = not states.esp
    btn.BackgroundColor3 = states.esp and Color3.fromRGB(50, 200, 50) or Color3.fromRGB(200, 50, 50)
end)

makeButton("Fly [ON/OFF]", 80, function(btn)
    states.fly = not states.fly
    btn.BackgroundColor3 = states.fly and Color3.fromRGB(50, 200, 50) or Color3.fromRGB(200, 50, 50)
end)

makeButton("NoClip [ON/OFF]", 120, function(btn)
    states.noclip = not states.noclip
    btn.BackgroundColor3 = states.noclip and Color3.fromRGB(50, 200, 50) or Color3.fromRGB(200, 50, 50)
end)

makeButton("AirJump [ON/OFF]", 160, function(btn)
    states.airjump = not states.airjump
    btn.BackgroundColor3 = states.airjump and Color3.fromRGB(50, 200, 50) or Color3.fromRGB(200, 50, 50)
end)

makeButton("ESP Color wechseln", 200, function(btn)
    colorIndex = colorIndex % #espColors + 1
    states.espColor = espColors[colorIndex]
    btn.Text = "ESP Color: " .. tostring(states.espColor)
end)

makeInput("Fly Speed:", 240, states.flySpeed, function(val)
    states.flySpeed = val
end)

makeInput("NoClip Speed:", 280, states.noclipSpeed, function(val)
    states.noclipSpeed = val
end)

makeButton("🗕 Minimieren", 330, function(btn)
    frame.Visible = false
    hint.Visible = true
    states.minimized = true
end)

makeButton("✖ Schließen", 365, function(btn)
    gui:Destroy()
end)

-- ESP + Movement Handling wie vorher
RunService.RenderStepped:Connect(function()
    for _, box in pairs(espBoxes) do box.Visible = false end
    if states.esp then
        for _, plr in pairs(Players:GetPlayers()) do
            if plr ~= LP and plr.Character and plr.Character:FindFirstChild("HumanoidRootPart") then
                local hrp = plr.Character.HumanoidRootPart
                local pos, onScreen = Camera:WorldToViewportPoint(hrp.Position)
                if not espBoxes[plr] then
                    local b = Drawing.new("Square")
                    b.Thickness = 2
                    b.Filled = false
                    espBoxes[plr] = b
                end
                local box = espBoxes[plr]
                box.Color = states.espColor
                box.Position = Vector2.new(pos.X - 25, pos.Y - 50)
                box.Size = Vector2.new(50, 100)
                box.Visible = onScreen
            end
        end
    end

    if states.fly or states.noclip then
        local char = LP.Character
        if not char then return end
        local hrp = char:FindFirstChild("HumanoidRootPart")
        if not hrp then return end

        local dir = Vector3.zero
        if UIS:IsKeyDown(Enum.KeyCode.W) then dir += Camera.CFrame.LookVector end
        if UIS:IsKeyDown(Enum.KeyCode.S) then dir -= Camera.CFrame.LookVector end
        if UIS:IsKeyDown(Enum.KeyCode.A) then dir -= Camera.CFrame.RightVector end
        if UIS:IsKeyDown(Enum.KeyCode.D) then dir += Camera.CFrame.RightVector end
        if UIS:IsKeyDown(Enum.KeyCode.Space) then dir += Vector3.new(0,1,0) end
        if UIS:IsKeyDown(Enum.KeyCode.LeftShift) then dir -= Vector3.new(0,1,0) end

        local speed = states.fly and states.flySpeed or states.noclipSpeed
        hrp.Velocity = dir.Magnitude > 0 and dir.Unit * speed * 25 or Vector3.zero

        if states.noclip then
            for _, part in pairs(char:GetDescendants()) do
                if part:IsA("BasePart") then part.CanCollide = false end
            end
        end
    end
end)

UIS.InputBegan:Connect(function(input, gpe)
    if gpe then return end
    if input.KeyCode == Enum.KeyCode.Space and states.airjump then
        LP.Character:FindFirstChildOfClass("Humanoid"):ChangeState(Enum.HumanoidStateType.Jumping)
    end
end)
